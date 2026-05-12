import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AddressInfo } from 'node:net';
import { io, Socket } from 'socket.io-client';
import { GameGateway } from '../src/game/game.gateway';
import { GameService } from '../src/game/game.service';
import { LyricsService } from '../src/game/lyrics.service';
import { PersistenceService } from '../src/game/persistence.service';

jest.setTimeout(20000);

describe('Game e2e', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  let app: INestApplication;
  let baseUrl: string;
  let gameGateway: GameGateway;
  let gameService: GameService;
  let persistenceService: PersistenceService;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    process.env.DATABASE_URL = '';
    const { AppModule } = require('../src/app.module');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(LyricsService)
      .useValue({
        getMaskedLyrics: jest.fn(async () => ({
          provider: 'test-double',
          rawLyrics: 'Integration Anthem lights up the room.',
          maskedLyrics: '••••••••••••••••••• lights up the room.',
        })),
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
    await app.listen(0);

    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    gameGateway = app.get(GameGateway);
    gameService = app.get(GameService);
    persistenceService = app.get(PersistenceService);
  });

  afterEach(async () => {
    for (const socket of sockets.splice(0)) {
      socket.removeAllListeners();
      socket.disconnect();
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    process.env.DATABASE_URL = originalDatabaseUrl;
    if (app) {
      await app.close();
    }
  });

  it('covers create room, join room, get room, socket gameplay, scoring, and next round', async () => {
    const createSongResponse = await request(app.getHttpServer())
      .post('/songs')
      .send({
        title: 'Integration Anthem',
        artist: 'Test Artist',
        language: 'en',
        aliases: ['IA'],
        localLyrics: 'Integration Anthem lights up the room.',
      })
      .expect(201);

    const createSecondSongResponse = await request(app.getHttpServer())
      .post('/songs')
      .send({
        title: 'Integration Encore',
        artist: 'Test Artist',
        language: 'en',
        aliases: ['IE'],
        localLyrics: 'Integration Encore keeps the room alive.',
      })
      .expect(201);

    const createdSong = createSongResponse.body;
    const createdSecondSong = createSecondSongResponse.body;
    jest
      .spyOn(persistenceService, 'getSongs')
      .mockResolvedValue([createdSong, createdSecondSong]);

    const createRoomResponse = await request(app.getHttpServer())
      .post('/rooms')
      .send({
        nickname: 'Host',
        totalRounds: 2,
        roundDurationSeconds: 15,
      })
      .expect(201);

    expect(createRoomResponse.body.room.code).toHaveLength(5);
    expect(createRoomResponse.body.room.players).toHaveLength(1);

    const roomCode = createRoomResponse.body.room.code as string;
    const hostPlayerId = createRoomResponse.body.playerId as string;

    const joinRoomResponse = await request(app.getHttpServer())
      .post(`/rooms/${roomCode}/join`)
      .send({ nickname: 'Guest' })
      .expect(201);

    const guestPlayerId = joinRoomResponse.body.playerId as string;

    const getRoomResponse = await request(app.getHttpServer())
      .get(`/rooms/${roomCode}`)
      .expect(200);

    expect(getRoomResponse.body.code).toBe(roomCode);
    expect(getRoomResponse.body.players).toHaveLength(2);

    const hostSocket = await connectSocket();
    const guestSocket = await connectSocket();

    await emitWithAck(hostSocket, 'join_room', {
      roomCode,
      playerId: hostPlayerId,
    });
    await emitWithAck(guestSocket, 'join_room', {
      roomCode,
      playerId: guestPlayerId,
    });

    const roundStartedPromise = waitForSocketEvent<{
      roundNumber: number;
      phase: string;
    }>(hostSocket, 'round_started');
    await gameGateway.startGame({
      roomCode,
      playerId: hostPlayerId,
    });
    const startedRound = await roundStartedPromise;

    expect(startedRound.roundNumber).toBe(1);
    expect(startedRound.phase).toBe('guessing');

    const firstRoundTitle = getCurrentRoundTitle(roomCode);
    const guessResult = await emitWithAck<{
      correct: boolean;
      score: number;
      playerId: string;
      room: { players: Array<{ id: string; score: number }> };
    }>(guestSocket, 'submit_guess', {
      roomCode,
      playerId: guestPlayerId,
      guess: firstRoundTitle,
    });

    expect(guessResult.correct).toBe(true);
    expect(guessResult.playerId).toBe(guestPlayerId);
    expect(guessResult.score).toBeGreaterThan(100);
    expect(
      guessResult.room.players.find((player) => player.id === guestPlayerId)?.score,
    ).toBe(guessResult.score);

    await finishCurrentRound(roomCode);

    const nextRoundStartedPromise = waitForSocketEvent<{
      roundNumber: number;
      phase: string;
    }>(hostSocket, 'round_started');
    await gameGateway.nextRound({
      roomCode,
      playerId: hostPlayerId,
    });
    const nextRoundStarted = await nextRoundStartedPromise;

    expect(nextRoundStarted.roundNumber).toBe(2);
    expect(nextRoundStarted.phase).toBe('guessing');
  });

  it('covers error scenarios for room lookup and invalid socket actions', async () => {
    await request(app.getHttpServer())
      .post('/rooms/NOPE1/join')
      .send({ nickname: 'Ghost' })
      .expect(404);

    await request(app.getHttpServer()).get('/rooms/NOPE1').expect(404);

    const createRoomResponse = await request(app.getHttpServer())
      .post('/rooms')
      .send({
        nickname: 'Solo Host',
        totalRounds: 1,
        roundDurationSeconds: 15,
      })
      .expect(201);

    const roomCode = createRoomResponse.body.room.code as string;
    const hostPlayerId = createRoomResponse.body.playerId as string;

    const hostSocket = await connectSocket();
    await emitWithAck(hostSocket, 'join_room', {
      roomCode,
      playerId: hostPlayerId,
    });

    await expect(
      gameGateway.startGame({
        roomCode,
        playerId: hostPlayerId,
      }),
    ).rejects.toMatchObject({
      message: 'At least two players are required.',
    });

    const joinRoomResponse = await request(app.getHttpServer())
      .post(`/rooms/${roomCode}/join`)
      .send({ nickname: 'Guest' })
      .expect(201);

    await expect(
      gameGateway.startGame({
        roomCode,
        playerId: joinRoomResponse.body.playerId,
      }),
    ).rejects.toMatchObject({
      message: 'Only the host can perform this action.',
    });

    await expect(
      emitWithAck(hostSocket, 'submit_guess', {
        roomCode,
        playerId: hostPlayerId,
        guess: '',
      }),
    ).rejects.toMatchObject({
      message: 'operation has timed out',
    });
  });

  async function connectSocket() {
    const socket = io(baseUrl, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });
    sockets.push(socket);

    await new Promise<void>((resolve, reject) => {
      const onConnect = () => {
        cleanup();
        resolve();
      };
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const cleanup = () => {
        socket.off('connect', onConnect);
        socket.off('connect_error', onError);
      };

      socket.on('connect', onConnect);
      socket.on('connect_error', onError);
    });

    return socket;
  }

  async function emitWithAck<T = unknown>(
    socket: Socket,
    event: string,
    payload: unknown,
  ): Promise<T> {
    return (await socket.timeout(3000).emitWithAck(event, payload)) as T;
  }

  async function waitForSocketEvent<T>(socket: Socket, event: string): Promise<T> {
    return await new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.off(event, handleEvent);
        reject(new Error(`Timed out waiting for socket event: ${event}`));
      }, 3000);

      const handleEvent = (payload: T) => {
        clearTimeout(timer);
        socket.off(event, handleEvent);
        resolve(payload);
      };

      socket.on(event, handleEvent);
    });
  }

  function getCurrentRoundTitle(roomCode: string) {
    const room = (
      gameService as unknown as {
        rooms: Map<string, { currentRound?: { songTitle: string } }>;
      }
    ).rooms.get(roomCode);

    if (!room?.currentRound?.songTitle) {
      throw new Error('Expected current round title to be available in memory');
    }

    return room.currentRound.songTitle;
  }

  async function finishCurrentRound(roomCode: string) {
    const room = (
      gameService as unknown as {
        rooms: Map<string, { currentRound?: { id: string } }>;
        finishRound: (roomCode: string, roundId: string) => Promise<void>;
      }
    ).rooms.get(roomCode);

    if (!room?.currentRound?.id) {
      throw new Error('Expected active round to exist before finishing it');
    }

    await (
      gameService as unknown as {
        finishRound: (roomCode: string, roundId: string) => Promise<void>;
      }
    ).finishRound(roomCode, room.currentRound.id);
  }
});
