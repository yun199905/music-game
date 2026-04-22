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

  it('stores local lyrics and normalized aliases when adding a custom song without a database', async () => {
    const service = new PersistenceService();

    const savedSong = await service.addSong({
      title: ' 晴天 ',
      artist: ' 周杰倫 ',
      language: 'zh-TW',
      aliases: [' 天晴 ', '晴天', ''],
      localLyrics: ' 窗外的麻雀在電線桿上多嘴。 ',
    });

    expect(savedSong.title).toBe('晴天');
    expect(savedSong.artist).toBe('周杰倫');
    expect(savedSong.aliases).toEqual(['天晴', '晴天']);
    expect(savedSong.localLyrics).toBe('窗外的麻雀在電線桿上多嘴。');
  });

  it('backfills local lyrics for existing seed songs in the database', async () => {
    const songRepository: MockRepository<SongEntity> = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'seed-1',
          title: 'Shape of You',
          artist: 'Ed Sheeran',
          language: 'en',
          aliases: [],
          enabled: true,
          localLyrics: null,
        },
      ]),
      save: jest.fn().mockResolvedValue(undefined),
    };

    const service = new PersistenceService(
      songRepository as Repository<SongEntity>,
    );

    await service.ensureSeedSongs();

    expect(songRepository.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'seed-1',
          title: 'Shape of You',
        }),
      ]),
    );
  });
});
