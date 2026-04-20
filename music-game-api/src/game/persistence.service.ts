import { Inject, Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSongDto } from './dto/create-song.dto';
import { GamePlayerEntity } from './entities/game-player.entity';
import { GameRoomEntity } from './entities/game-room.entity';
import { GameRoundEntity } from './entities/game-round.entity';
import { GuessEntity } from './entities/guess.entity';
import { LyricsCacheEntity } from './entities/lyrics-cache.entity';
import { SongEntity } from './entities/song.entity';
import { RoomState } from './game.types';
import { SeedSong, seedSongs } from './song-catalog';

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

    const count = await this.songRepository.count();
    if (count > 0) {
      return;
    }

    await this.songRepository.save(seedSongs.map((seed) => this.mapSeedToEntity(seed)));
  }

  async getSongs(): Promise<SongEntity[]> {
    if (this.songRepository) {
      return this.songRepository.find({
        where: { enabled: true },
        order: { artist: 'ASC', title: 'ASC' },
      });
    }

    return [...this.memorySongs.values()].filter((song) => song.enabled);
  }

  async addSong(dto: CreateSongDto): Promise<SongEntity> {
    const song = this.mapSeedToEntity(dto);
    if (this.songRepository) {
      return this.songRepository.save(song);
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
      const existing = await this.lyricsCacheRepository.findOne({ where: { songId: cache.songId } });
      if (existing) {
        await this.lyricsCacheRepository.save({ ...existing, ...cache });
        return;
      }

      await this.lyricsCacheRepository.save(this.lyricsCacheRepository.create(cache));
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

    await this.roomRepository.save({
      roomCode: room.code,
      hostPlayerId: room.hostPlayerId,
      status: room.status,
      currentRoundIndex: room.currentRoundIndex,
      totalRounds: room.totalRounds,
      roundDurationSeconds: room.roundDurationSeconds,
    });

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

  private mapSeedToEntity(song: SeedSong | CreateSongDto): SongEntity {
    return {
      id: crypto.randomUUID(),
      title: song.title,
      artist: song.artist,
      language: song.language,
      aliases: song.aliases ?? [],
      enabled: true,
    };
  }
}
