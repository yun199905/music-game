import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { SongEntity } from './entities/song.entity';
import { MaskingService } from './masking.service';
import { PersistenceService } from './persistence.service';
import { getSeedSongFallbackLyrics } from './song-catalog';

type LyricsPayload = {
  provider: string;
  rawLyrics: string;
  maskedLyrics: string;
};

@Injectable()
export class LyricsService {
  constructor(
    private readonly maskingService: MaskingService,
    private readonly persistenceService: PersistenceService,
  ) {}

  async getMaskedLyrics(song: SongEntity): Promise<LyricsPayload> {
    const cached = await this.persistenceService.getLyricsCache(song.id);
    if (cached) {
      return {
        provider: cached.provider,
        rawLyrics: cached.rawLyrics,
        maskedLyrics: cached.maskedLyrics,
      };
    }

    const localFallback = getSeedSongFallbackLyrics(song.artist, song.title);
    if (localFallback) {
      return this.buildAndCacheLyrics(song, localFallback, 'seed-local');
    }

    const provider = process.env.LYRICS_PROVIDER ?? 'lyrics.ovh';
    const baseUrl = process.env.LYRICS_API_BASE_URL ?? 'https://api.lyrics.ovh/v1';
    const { data } = await axios.get<{ lyrics?: string }>(
      `${baseUrl}/${encodeURIComponent(song.artist)}/${encodeURIComponent(song.title)}`,
      { timeout: 6000 },
    );

    const rawLyrics = (data.lyrics ?? '').trim();
    if (!rawLyrics) {
      throw new Error(`Lyrics not found for ${song.artist} - ${song.title}`);
    }

    return this.buildAndCacheLyrics(song, rawLyrics, provider);
  }

  private async buildAndCacheLyrics(
    song: SongEntity,
    rawLyrics: string,
    provider: string,
  ): Promise<LyricsPayload> {
    const maskedLyrics = this.maskingService.maskLyrics(rawLyrics, song.title, song.aliases ?? []);
    if (!maskedLyrics.trim() || maskedLyrics === rawLyrics) {
      throw new Error(`Masked lyrics invalid for ${song.artist} - ${song.title}`);
    }

    await this.persistenceService.saveLyricsCache({
      songId: song.id,
      provider,
      rawLyrics,
      maskedLyrics,
      cachedAt: new Date(),
    });

    return {
      provider,
      rawLyrics,
      maskedLyrics,
    };
  }
}
