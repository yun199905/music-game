import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { CreateSongDto } from './dto/create-song.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { SongEntity } from './entities/song.entity';
import { MaskingService } from './masking.service';
import { PersistenceService } from './persistence.service';
import { LyricsService } from './lyrics.service';
import { PlayerSession, RoomSnapshot, RoomState } from './game.types';

type Broadcaster = (roomCode: string, event: string, payload: unknown) => void;

@Injectable()
export class GameService implements OnModuleInit {
  private readonly logger = new Logger(GameService.name);
  private readonly rooms = new Map<string, RoomState>();
  private broadcaster?: Broadcaster;

  constructor(
    private readonly persistenceService: PersistenceService,
    private readonly maskingService: MaskingService,
    private readonly lyricsService: LyricsService,
  ) {}

  async onModuleInit() {
    await this.persistenceService.ensureSeedSongs();
  }

  registerBroadcaster(broadcaster: Broadcaster) {
    this.broadcaster = broadcaster;
  }

  async listSongs() {
    return this.persistenceService.getSongs();
  }

  async addSong(dto: CreateSongDto) {
    return this.persistenceService.addSong(dto);
  }

  async createRoom(dto: CreateRoomDto) {
    const roomCode = this.generateRoomCode();
    const host = this.createPlayer(dto.nickname, true);
    const room: RoomState = {
      code: roomCode,
      status: 'lobby',
      phase: 'idle',
      hostPlayerId: host.id,
      maxPlayers: 8,
      totalRounds: dto.totalRounds ?? 5,
      roundDurationSeconds: dto.roundDurationSeconds ?? 30,
      currentRoundIndex: 0,
      players: new Map([[host.id, host]]),
      usedSongIds: new Set<string>(),
    };

    this.rooms.set(roomCode, room);
    await this.persistenceService.persistRoom(room);

    return {
      playerId: host.id,
      room: this.toSnapshot(room),
    };
  }

  async joinRoom(roomCode: string, dto: JoinRoomDto) {
    const room = this.getRoom(roomCode);
    const normalizedNickname = dto.nickname.trim();
    const existingPlayer = [...room.players.values()].find(
      (player) => player.nickname.toLowerCase() === normalizedNickname.toLowerCase(),
    );

    if (existingPlayer) {
      if (existingPlayer.connected) {
        throw new BadRequestException('Nickname is already in use.');
      }

      existingPlayer.connected = true;
      await this.persistenceService.persistRoom(room);
      return {
        playerId: existingPlayer.id,
        room: this.toSnapshot(room),
      };
    }

    if (room.status !== 'lobby') {
      throw new BadRequestException('Room already started.');
    }

    if (room.players.size >= room.maxPlayers) {
      throw new BadRequestException('Room is full.');
    }

    const player = this.createPlayer(normalizedNickname, false);
    room.players.set(player.id, player);
    await this.persistenceService.persistRoom(room);

    return {
      playerId: player.id,
      room: this.toSnapshot(room),
    };
  }

  async attachSocket(roomCode: string, playerId: string, socketId: string) {
    const room = this.getRoom(roomCode);
    const player = this.getPlayer(room, playerId);
    player.connected = true;
    player.socketId = socketId;
    await this.persistenceService.persistRoom(room);

    return this.toSnapshot(room);
  }

  async detachSocket(socketId: string) {
    const room = [...this.rooms.values()].find((entry) =>
      [...entry.players.values()].some((player) => player.socketId === socketId),
    );

    if (!room) {
      return;
    }

    const player = [...room.players.values()].find((entry) => entry.socketId === socketId);
    if (!player) {
      return;
    }

    player.connected = false;
    player.socketId = undefined;
    await this.persistenceService.persistRoom(room);
    this.emit(room.code, 'room_state', this.toSnapshot(room));
  }

  async startGame(roomCode: string, playerId: string) {
    const room = this.getRoom(roomCode);
    this.ensureHost(room, playerId);

    if (room.players.size < 2) {
      throw new BadRequestException('At least two players are required.');
    }

    if (room.status === 'finished') {
      throw new BadRequestException('Game already finished.');
    }

    if (room.phase === 'guessing') {
      throw new BadRequestException('Round is already active.');
    }

    room.status = 'in_progress';
    room.currentRoundIndex = 1;
    const round = await this.prepareRound(room);
    room.currentRound = round;
    room.phase = 'guessing';

    await this.persistenceService.persistRoom(room);
    await this.persistenceService.createRound(round);

    this.scheduleRoundTimeout(room.code, round.id);

    return {
      room: this.toSnapshot(room),
      round: this.toSnapshot(room).currentRound,
    };
  }

  async nextRound(roomCode: string, playerId: string) {
    const room = this.getRoom(roomCode);
    this.ensureHost(room, playerId);

    if (room.phase === 'guessing') {
      throw new BadRequestException('Current round is still active.');
    }

    if (room.currentRoundIndex >= room.totalRounds) {
      room.status = 'finished';
      room.phase = 'revealed';
      await this.persistenceService.persistRoom(room);
      return {
        room: this.toSnapshot(room),
        gameEnded: true,
      };
    }

    room.currentRoundIndex += 1;
    const round = await this.prepareRound(room);
    room.currentRound = round;
    room.phase = 'guessing';

    await this.persistenceService.persistRoom(room);
    await this.persistenceService.createRound(round);

    this.scheduleRoundTimeout(room.code, round.id);

    return {
      room: this.toSnapshot(room),
      round: this.toSnapshot(room).currentRound,
      gameEnded: false,
    };
  }

  async submitGuess(roomCode: string, playerId: string, guess: string) {
    const room = this.getRoom(roomCode);
    const player = this.getPlayer(room, playerId);
    const round = room.currentRound;

    if (!round || room.phase !== 'guessing') {
      throw new BadRequestException('No active round.');
    }

    const normalizedGuess = this.maskingService.normalize(guess);
    const isCorrect = round.acceptedAnswers.includes(normalizedGuess);

    await this.persistenceService.recordGuess({
      roundId: round.id,
      roomCode: room.code,
      playerId,
      guessText: guess,
      normalizedGuess,
      isCorrect,
    });

    if (!isCorrect || round.guessedPlayerIds.has(playerId)) {
      return {
        room: this.toSnapshot(room),
        correct: false,
      };
    }

    round.guessedPlayerIds.add(playerId);
    const remainingSeconds = Math.max(
      0,
      Math.ceil((new Date(round.endsAt).getTime() - Date.now()) / 1000),
    );
    player.score += 100 + remainingSeconds;
    round.winnerPlayerId ??= playerId;

    await this.persistenceService.persistRoom(room);
    this.emit(room.code, 'room_state', this.toSnapshot(room));

    return {
      room: this.toSnapshot(room),
      correct: true,
      playerId,
      score: player.score,
    };
  }

  getSnapshot(roomCode: string) {
    return this.toSnapshot(this.getRoom(roomCode));
  }

  private async prepareRound(room: RoomState) {
    const songs = await this.persistenceService.getSongs();
    const availableSongs = songs.filter((song) => !room.usedSongIds.has(song.id));
    if (availableSongs.length === 0) {
      throw new BadRequestException('No songs left in the catalog.');
    }

    const shuffled = [...availableSongs].sort(() => Math.random() - 0.5);
    for (const song of shuffled) {
      try {
        const lyrics = await this.lyricsService.getMaskedLyrics(song);
        room.usedSongIds.add(song.id);
        return {
          id: crypto.randomUUID(),
          roomCode: room.code,
          roundNumber: room.currentRoundIndex,
          songId: song.id,
          songTitle: song.title,
          songArtist: song.artist,
          acceptedAnswers: this.maskingService.buildAnswerSet(song.title, song.aliases ?? []),
          maskedLyrics: lyrics.maskedLyrics,
          rawLyrics: lyrics.rawLyrics,
          startedAt: new Date().toISOString(),
          endsAt: new Date(Date.now() + room.roundDurationSeconds * 1000).toISOString(),
          guessedPlayerIds: new Set<string>(),
          phase: 'guessing' as const,
        };
      } catch (error) {
        this.logger.warn(`Skipping song ${song.artist} - ${song.title}: ${(error as Error).message}`);
      }
    }

    throw new BadRequestException('Unable to prepare a playable round from the current catalog.');
  }

  private scheduleRoundTimeout(roomCode: string, roundId: string) {
    const room = this.getRoom(roomCode);
    const round = room.currentRound;

    if (!round || round.id !== roundId) {
      return;
    }

    round.timer = setTimeout(() => {
      void this.finishRound(roomCode, roundId);
    }, room.roundDurationSeconds * 1000);
  }

  private async finishRound(roomCode: string, roundId: string) {
    const room = this.getRoom(roomCode);
    const round = room.currentRound;
    if (!round || round.id !== roundId || room.phase !== 'guessing') {
      return;
    }

    if (round.timer) {
      clearTimeout(round.timer);
    }

    round.phase = 'revealed';
    room.phase = 'revealed';
    await this.persistenceService.persistRoom(room);
    await this.persistenceService.endRound(round);

    const snapshot = this.toSnapshot(room);
    this.emit(room.code, 'room_state', snapshot);
    this.emit(room.code, 'round_ended', snapshot.currentRound);
  }

  private emit(roomCode: string, event: string, payload: unknown) {
    this.broadcaster?.(roomCode, event, payload);
  }

  private createPlayer(nickname: string, isHost: boolean): PlayerSession {
    return {
      id: crypto.randomUUID(),
      nickname: nickname.trim(),
      score: 0,
      isHost,
      connected: true,
    };
  }

  private toSnapshot(room: RoomState): RoomSnapshot {
    const players = [...room.players.values()]
      .map((player) => ({
        id: player.id,
        nickname: player.nickname,
        score: player.score,
        isHost: player.isHost,
        connected: player.connected,
      }))
      .sort((left, right) => right.score - left.score || left.nickname.localeCompare(right.nickname));

    return {
      code: room.code,
      status: room.status,
      phase: room.phase,
      hostPlayerId: room.hostPlayerId,
      totalRounds: room.totalRounds,
      roundDurationSeconds: room.roundDurationSeconds,
      currentRoundIndex: room.currentRoundIndex,
      maxPlayers: room.maxPlayers,
      players,
      currentRound: room.currentRound
        ? {
            id: room.currentRound.id,
            roundNumber: room.currentRound.roundNumber,
            maskedLyrics: room.currentRound.maskedLyrics,
            startedAt: room.currentRound.startedAt,
            endsAt: room.currentRound.endsAt,
            phase: room.currentRound.phase,
            winnerPlayerId: room.currentRound.winnerPlayerId,
            revealTitle: room.currentRound.phase === 'revealed' ? room.currentRound.songTitle : undefined,
            revealArtist:
              room.currentRound.phase === 'revealed' ? room.currentRound.songArtist : undefined,
          }
        : undefined,
    };
  }

  private ensureHost(room: RoomState, playerId: string) {
    if (room.hostPlayerId !== playerId) {
      throw new BadRequestException('Only the host can perform this action.');
    }
  }

  private getRoom(roomCode: string): RoomState {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) {
      throw new NotFoundException('Room not found.');
    }
    return room;
  }

  private getPlayer(room: RoomState, playerId: string): PlayerSession {
    const player = room.players.get(playerId);
    if (!player) {
      throw new NotFoundException('Player not found.');
    }
    return player;
  }

  private generateRoomCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join(
        '',
      );
    } while (this.rooms.has(code));

    return code;
  }
}
