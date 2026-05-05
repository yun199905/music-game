import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GameService } from './game.service';
import { JoinRoomDto } from './dto/join-room.dto';
import { PersistenceService } from './persistence.service';

describe('GameService player lifecycle', () => {
  const broadcaster = jest.fn();

  const createService = () => {
    const persistenceService = {
      ensureSeedSongs: jest.fn().mockResolvedValue(undefined),
      persistRoom: jest.fn().mockResolvedValue(undefined),
      removeRoom: jest.fn().mockResolvedValue(undefined),
      getSongs: jest.fn().mockResolvedValue([]),
      addSong: jest.fn(),
      createRound: jest.fn().mockResolvedValue(undefined),
      endRound: jest.fn().mockResolvedValue(undefined),
      recordGuess: jest.fn().mockResolvedValue(undefined),
    } as unknown as PersistenceService;

    const service = new GameService(
      persistenceService,
      {
        normalize: jest.fn((value: string) => value),
        buildAnswerSet: jest.fn().mockReturnValue([]),
      } as never,
      {
        getMaskedLyrics: jest.fn(),
      } as never,
    );
    service.registerBroadcaster(broadcaster);

    return { service, persistenceService };
  };

  const joinGuest = (service: GameService, roomCode: string, nickname = 'Guest') =>
    service.joinRoom(roomCode, { nickname } as JoinRoomDto);

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('transfers host ownership when the host leaves explicitly', async () => {
    const { service } = createService();
    const created = await service.createRoom({ nickname: 'Host', totalRounds: 3 });
    const joined = await joinGuest(service, created.room.code);

    const result = await service.leaveRoom(created.room.code, created.playerId);

    expect(result.roomClosed).toBe(false);
    if (result.roomClosed) {
      throw new Error('Expected room to remain active');
    }

    expect(result.room.hostPlayerId).toBe(joined.playerId);
    expect(result.room.players).toHaveLength(1);
    expect(result.room.players[0]).toMatchObject({
      id: joined.playerId,
      isHost: true,
    });
  });

  it('releases the player slot when a non-host leaves explicitly', async () => {
    const { service } = createService();
    const created = await service.createRoom({ nickname: 'Host', totalRounds: 3 });
    const joined = await joinGuest(service, created.room.code, 'Guest 1');

    await service.leaveRoom(created.room.code, joined.playerId);

    const rejoined = await joinGuest(service, created.room.code, 'Guest 2');
    const snapshot = service.getSnapshot(created.room.code);
    expect(rejoined.playerId).toBeDefined();
    expect(snapshot.players).toHaveLength(2);
    expect(snapshot.players.map((player) => player.nickname)).toEqual(
      expect.arrayContaining(['Host', 'Guest 2']),
    );
  });

  it('requires at least two connected players to start the game', async () => {
    const { service } = createService();
    const created = await service.createRoom({ nickname: 'Host', totalRounds: 3 });
    const joined = await joinGuest(service, created.room.code);

    await service.attachSocket(created.room.code, created.playerId, 'host-socket');
    await service.attachSocket(created.room.code, joined.playerId, 'guest-socket');
    await service.detachSocket('guest-socket');

    await expect(service.startGame(created.room.code, created.playerId)).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.startGame(created.room.code, created.playerId)).rejects.toThrow(
      'At least two players are required.',
    );
  });

  it('transfers host ownership after the host disconnect grace period expires', async () => {
    const { service } = createService();
    const created = await service.createRoom({ nickname: 'Host', totalRounds: 3 });
    const joined = await joinGuest(service, created.room.code);

    await service.attachSocket(created.room.code, created.playerId, 'host-socket');
    await service.attachSocket(created.room.code, joined.playerId, 'guest-socket');
    await service.detachSocket('host-socket');

    await jest.advanceTimersByTimeAsync(15000);

    const snapshot = service.getSnapshot(created.room.code);
    expect(snapshot.hostPlayerId).toBe(joined.playerId);
    expect(snapshot.players).toHaveLength(1);
    expect(snapshot.players[0]).toMatchObject({
      id: joined.playerId,
      isHost: true,
      connected: true,
    });
  });

  it('closes the room if the host disconnects and nobody else can take over', async () => {
    const { service, persistenceService } = createService();
    const created = await service.createRoom({ nickname: 'Solo Host', totalRounds: 1 });

    await service.attachSocket(created.room.code, created.playerId, 'host-socket');
    await service.detachSocket('host-socket');

    await jest.advanceTimersByTimeAsync(15000);

    expect(() => service.getSnapshot(created.room.code)).toThrow(NotFoundException);
    expect(
      (persistenceService.removeRoom as unknown as jest.Mock).mock.calls,
    ).toContainEqual([created.room.code]);
    expect(broadcaster).toHaveBeenCalledWith(created.room.code, 'room_closed', {
      roomCode: created.room.code,
    });
  });
});
