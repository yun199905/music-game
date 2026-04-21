import axios from 'axios';
import { SongEntity } from './entities/song.entity';
import { LyricsService } from './lyrics.service';
import { MaskingService } from './masking.service';
import { PersistenceService } from './persistence.service';

jest.mock('axios');

describe('LyricsService', () => {
  const mockedAxios = jest.mocked(axios);

  const song: SongEntity = {
    id: 'song-1',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    language: 'en',
    enabled: true,
  };

  const persistenceService = {
    getLyricsCache: jest.fn(),
    saveLyricsCache: jest.fn(),
  } as unknown as PersistenceService;

  const service = new LyricsService(new MaskingService(), persistenceService);

  beforeEach(() => {
    jest.resetAllMocks();
    (persistenceService.getLyricsCache as jest.Mock).mockResolvedValue(null);
    (persistenceService.saveLyricsCache as jest.Mock).mockResolvedValue(undefined);
  });

  it('uses bundled fallback lyrics for seed songs without calling the external provider', async () => {
    const result = await service.getMaskedLyrics(song);

    expect(mockedAxios.get).not.toHaveBeenCalled();
    expect(result.provider).toBe('seed-local');
    expect(result.rawLyrics).toContain('Shape of You');
    expect(result.maskedLyrics).not.toContain('Shape of You');
    expect(persistenceService.saveLyricsCache).toHaveBeenCalled();
  });
});
