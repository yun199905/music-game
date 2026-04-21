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
});
