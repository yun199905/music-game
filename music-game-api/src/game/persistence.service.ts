import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { GamePlayerEntity } from './entities/game-player.entity';
import { GameRoomEntity } from './entities/game-room.entity';
import { GameRoundEntity } from './entities/game-round.entity';
import { GuessEntity } from './entities/guess.entity';
import { LyricsCacheEntity } from './entities/lyrics-cache.entity';
import { SongEntity } from './entities/song.entity';
import { RoomState } from './game.types';
import { SeedSong, findSeedSong, seedSongs } from './song-catalog';

@Injectable()
export class PersistenceService {
  private readonly memorySongs = new Map<string, SongEntity>();
  private readonly memoryLyricsCache = new Map<string, LyricsCacheEntity>();

  constructor(
    @Optional()
    @InjectRepository(SongEntity)
    private readonly songRepository?: Repository<SongEntity>,
    @Optional()
    @InjectRepository(LyricsCacheEntity)
    private readonly lyricsCacheRepository?: Repository<LyricsCacheEntity>,
    @Optional()
    @InjectRepository(GameRoomEntity)
    private readonly roomRepository?: Repository<GameRoomEntity>,
    @Optional()
    @InjectRepository(GamePlayerEntity)
    private readonly playerRepository?: Repository<GamePlayerEntity>,
    @Optional()
    @InjectRepository(GameRoundEntity)
    private readonly roundRepository?: Repository<GameRoundEntity>,
    @Optional()
    @InjectRepository(GuessEntity)
    private readonly guessRepository?: Repository<GuessEntity>,
  ) {
    for (const seed of seedSongs) {
      const entity = this.mapSeedToEntity(seed);
      this.memorySongs.set(entity.id, entity);
    }
  }

  get databaseEnabled(): boolean {
    return Boolean(this.songRepository);
  }

  async ensureSeedSongs() {
    if (!this.songRepository) {
      return;
    }

    const existingSongs = await this.songRepository.find();
    if (existingSongs.length > 0) {
      const missingLocalLyrics = existingSongs.flatMap((song) => {
        const seed = findSeedSong(song.artist, song.title);
        if (!seed?.fallbackLyrics || song.localLyrics?.trim()) {
          return [];
        }

        return [
          {
            ...song,
            localLyrics: seed.fallbackLyrics,
            aliases: song.aliases?.length ? song.aliases : (seed.aliases ?? []),
            language: song.language ?? seed.language,
          },
        ];
      });

      if (missingLocalLyrics.length > 0) {
        await this.songRepository.save(missingLocalLyrics);
      }

      return;
    }

    await this.songRepository.save(
      seedSongs.map((seed) => this.mapSeedToEntity(seed)),
    );
  }

  async invalidateUnrestorableRooms(): Promise<void> {
    if (!this.roomRepository || !this.playerRepository) {
      return;
    }

    await this.playerRepository.delete({});
    await this.roomRepository.delete({});

    if (!this.roundRepository) {
      return;
    }

    await this.roundRepository
      .createQueryBuilder()
      .update()
      .set({ endedAt: new Date() })
      .where('endedAt IS NULL')
      .execute();
  }

  async getSongs(): Promise<SongEntity[]> {
    const songs = await this.getAllSongs();

    return songs.filter((song) => song.enabled);
  }

  async getManageableSongs(): Promise<SongEntity[]> {
    return this.getAllSongs();
  }

  async addSong(dto: CreateSongDto): Promise<SongEntity> {
    await this.ensureUniqueSong(dto.title, dto.artist);
    const song = this.mapSongInputToEntity(dto);
    return this.saveSong(song);
  }

  async updateSong(id: string, dto: UpdateSongDto): Promise<SongEntity> {
    const existing = await this.getSongById(id);
    const nextSong = this.mapSongInputToEntity(
      {
        title: dto.title ?? existing.title,
        artist: dto.artist ?? existing.artist,
        language: dto.language ?? existing.language,
        aliases: dto.aliases ?? existing.aliases ?? [],
        localLyrics:
          dto.localLyrics === undefined
            ? (existing.localLyrics ?? undefined)
            : dto.localLyrics,
      },
      existing,
    );

    nextSong.enabled = dto.enabled ?? existing.enabled;
    await this.ensureUniqueSong(nextSong.title, nextSong.artist, existing.id);
    return this.saveSong(nextSong);
  }

  private async getAllSongs(): Promise<SongEntity[]> {
    if (this.songRepository) {
      return this.songRepository.find({
        order: { artist: 'ASC', title: 'ASC' },
      });
    }

    return [...this.memorySongs.values()]
      .sort(
        (left, right) =>
          left.artist.localeCompare(right.artist) ||
          left.title.localeCompare(right.title),
      );
  }

  private async getSongById(id: string): Promise<SongEntity> {
    if (this.songRepository) {
      const song = await this.songRepository.findOne({ where: { id } });
      if (!song) {
        throw new NotFoundException('Song not found.');
      }

      return song;
    }

    const song = this.memorySongs.get(id);
    if (!song) {
      throw new NotFoundException('Song not found.');
    }

    return song;
  }

  private async saveSong(song: SongEntity): Promise<SongEntity> {
    if (this.songRepository) {
      const savedSong = await this.songRepository.save(song);
      this.memorySongs.set(savedSong.id, savedSong);
      return savedSong;
    }

    this.memorySongs.set(song.id, song);
    return song;
  }

  async getLyricsCache(songId: string): Promise<LyricsCacheEntity | null> {
    if (this.lyricsCacheRepository) {
      return this.lyricsCacheRepository.findOne({ where: { songId } });
    }

    return this.memoryLyricsCache.get(songId) ?? null;
  }

  async saveLyricsCache(cache: Omit<LyricsCacheEntity, 'id'>): Promise<void> {
    if (this.lyricsCacheRepository) {
      const existing = await this.lyricsCacheRepository.findOne({
        where: { songId: cache.songId },
      });
      if (existing) {
        await this.lyricsCacheRepository.save({ ...existing, ...cache });
        return;
      }

      await this.lyricsCacheRepository.save(
        this.lyricsCacheRepository.create(cache),
      );
      return;
    }

    this.memoryLyricsCache.set(cache.songId, {
      id: cache.songId,
      ...cache,
    });
  }

  async persistRoom(room: RoomState): Promise<void> {
    if (!this.roomRepository || !this.playerRepository) {
      return;
    }

    await this.roomRepository.upsert(
      {
        roomCode: room.code,
        hostPlayerId: room.hostPlayerId,
        status: room.status,
        currentRoundIndex: room.currentRoundIndex,
        totalRounds: room.totalRounds,
        roundDurationSeconds: room.roundDurationSeconds,
      },
      ['roomCode'],
    );

    await this.playerRepository.delete({ roomCode: room.code });
    await this.playerRepository.save(
      [...room.players.values()].map((player) => ({
        id: player.id,
        roomCode: room.code,
        nickname: player.nickname,
        score: player.score,
        isHost: player.isHost,
        connected: player.connected,
      })),
    );
  }

  async removeRoom(roomCode: string): Promise<void> {
    if (!this.roomRepository || !this.playerRepository) {
      return;
    }

    await this.playerRepository.delete({ roomCode });
    await this.roomRepository.delete({ roomCode });
  }

  async createRound(round: RoomState['currentRound']): Promise<void> {
    if (!round || !this.roundRepository) {
      return;
    }

    await this.roundRepository.save({
      id: round.id,
      roomCode: round.roomCode,
      songId: round.songId,
      songTitle: round.songTitle,
      songArtist: round.songArtist,
      roundNumber: round.roundNumber,
      startedAt: new Date(round.startedAt),
    });
  }

  async endRound(round: RoomState['currentRound']): Promise<void> {
    if (!round || !this.roundRepository) {
      return;
    }

    await this.roundRepository.save({
      id: round.id,
      roomCode: round.roomCode,
      songId: round.songId,
      songTitle: round.songTitle,
      songArtist: round.songArtist,
      roundNumber: round.roundNumber,
      winnerPlayerId: round.winnerPlayerId,
      startedAt: new Date(round.startedAt),
      endedAt: new Date(),
    });
  }

  async recordGuess(params: {
    roundId: string;
    roomCode: string;
    playerId: string;
    guessText: string;
    normalizedGuess: string;
    isCorrect: boolean;
  }): Promise<void> {
    if (!this.guessRepository) {
      return;
    }

    await this.guessRepository.save({
      ...params,
      submittedAt: new Date(),
    });
  }

  private mapSeedToEntity(song: SeedSong): SongEntity {
    return this.mapSongInputToEntity(
      {
        title: song.title,
        artist: song.artist,
        language: song.language,
        aliases: song.aliases ?? [],
        localLyrics: song.fallbackLyrics,
      },
      {
        id: crypto.randomUUID(),
        enabled: true,
      } as SongEntity,
    );
  }

  private mapSongInputToEntity(
    song: CreateSongDto | UpdateSongDto,
    existing?: SongEntity,
  ): SongEntity {
    const aliases = (song.aliases ?? [])
      .map((alias) => alias.trim())
      .filter(Boolean);
    const uniqueAliases = [...new Set(aliases)];

    return {
      id: existing?.id ?? crypto.randomUUID(),
      title: song.title.trim(),
      artist: song.artist.trim(),
      language: song.language,
      aliases: uniqueAliases,
      enabled: existing?.enabled ?? true,
      localLyrics: song.localLyrics?.trim() || null,
    };
  }

  private async ensureUniqueSong(title: string, artist: string, ignoreId?: string) {
    const duplicate = (await this.getAllSongs()).find((song) => {
      if (song.id === ignoreId) {
        return false;
      }

      return this.songIdentity(song.title, song.artist) === this.songIdentity(title, artist);
    });

    if (duplicate) {
      throw new BadRequestException('Song title and artist must be unique.');
    }
  }

  private songIdentity(title: string, artist: string) {
    return `${this.normalizeSongIdentityPart(artist)}::${this.normalizeSongIdentityPart(title)}`;
  }

  private normalizeSongIdentityPart(value: string) {
    return value.normalize('NFKC').replace(/\s+/g, '').toLowerCase();
  }
}
