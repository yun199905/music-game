import axios from 'axios';
import { SongEntity } from './entities/song.entity';
import { LyricsService } from './lyrics.service';
import { MaskingService } from './masking.service';
import { PersistenceService } from './persistence.service';

jest.mock('axios');

describe('LyricsService', () => {
  const mockedAxios = jest.mocked(axios);
  const getLyricsCacheMock = jest.fn();
  const saveLyricsCacheMock = jest.fn();

  const song: SongEntity = {
    id: 'song-1',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    language: 'en',
    enabled: true,
    aliases: [],
    localLyrics: null,
  };

  const persistenceService = {
    getLyricsCache: getLyricsCacheMock,
    saveLyricsCache: saveLyricsCacheMock,
  } as unknown as PersistenceService;

  const service = new LyricsService(new MaskingService(), persistenceService);

  beforeEach(() => {
    jest.resetAllMocks();
    getLyricsCacheMock.mockResolvedValue(null);
    saveLyricsCacheMock.mockResolvedValue(undefined);
  });

  it('uses bundled fallback lyrics for seed songs without calling the external provider', async () => {
    const result = await service.getMaskedLyrics(song);

    expect(mockedAxios.get.mock.calls).toHaveLength(0);
    expect(result.provider).toBe('seed-local');
    expect(result.rawLyrics).toContain('Shape of You');
    expect(result.maskedLyrics).not.toContain('Shape of You');
    expect(saveLyricsCacheMock).toHaveBeenCalled();
  });

  it('uses catalog-local lyrics for Chinese songs without calling the external provider', async () => {
    const result = await service.getMaskedLyrics({
      id: 'song-zh-1',
      title: '晴天',
      artist: '周杰倫',
      language: 'zh-TW',
      enabled: true,
      aliases: ['天晴'],
      localLyrics: '窗外的麻雀在電線桿上多嘴，你說這一句晴天值得再猜一回。',
    });

    expect(mockedAxios.get.mock.calls).toHaveLength(0);
    expect(result.provider).toBe('catalog-local');
    expect(result.rawLyrics).toContain('晴天');
    expect(result.maskedLyrics).not.toContain('晴天');
  });

  it('fails early for Chinese songs that do not provide local lyrics', async () => {
    await expect(
      service.getMaskedLyrics({
        id: 'song-zh-2',
        title: '七里香',
        artist: '周杰倫',
        language: 'zh-TW',
        enabled: true,
        aliases: [],
        localLyrics: null,
      }),
    ).rejects.toThrow('Local lyrics are required for zh-TW songs');
    expect(mockedAxios.get.mock.calls).toHaveLength(0);
  });
});
