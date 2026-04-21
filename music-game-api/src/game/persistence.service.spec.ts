import { Repository } from 'typeorm';
import { PersistenceService } from './persistence.service';
import { RoomState } from './game.types';

type MockRepository<T> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('PersistenceService', () => {
  const createRoomState = (): RoomState => ({
    code: 'EA8HE',
    status: 'lobby',
    phase: 'idle',
    hostPlayerId: 'host-1',
    maxPlayers: 8,
    totalRounds: 1,
    roundDurationSeconds: 30,
    currentRoundIndex: 0,
    players: new Map([
      [
        'host-1',
        {
          id: 'host-1',
          nickname: 'Host',
          score: 0,
          isHost: true,
          connected: true,
        },
      ],
    ]),
    usedSongIds: new Set<string>(),
  });

  it('upserts an existing room by roomCode instead of inserting a duplicate row', async () => {
    const roomRepository: MockRepository<unknown> = {
      upsert: jest.fn().mockResolvedValue(undefined),
    };
    const playerRepository: MockRepository<unknown> = {
      delete: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const service = new PersistenceService(
      undefined,
      undefined,
      roomRepository as Repository<never>,
      playerRepository as Repository<never>,
      undefined,
      undefined,
    );

    const room = createRoomState();

    await service.persistRoom(room);
    await service.persistRoom(room);

    expect(roomRepository.upsert).toHaveBeenCalledTimes(2);
    expect(roomRepository.upsert).toHaveBeenCalledWith(
      {
        roomCode: 'EA8HE',
        hostPlayerId: 'host-1',
        status: 'lobby',
        currentRoundIndex: 0,
        totalRounds: 1,
        roundDurationSeconds: 30,
      },
      ['roomCode'],
    );
    expect(playerRepository.delete).toHaveBeenCalledTimes(2);
    expect(playerRepository.save).toHaveBeenCalledTimes(2);
  });
});
