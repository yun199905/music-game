import { Injectable } from '@nestjs/common';

@Injectable()
export class MaskingService {
  normalize(text: string): string {
    return text
      .normalize('NFKC')
      .toLowerCase()
      .replace(/\([^)]*\)/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, '');
  }

  buildAnswerSet(title: string, aliases: string[] = []): string[] {
    const variants = new Set<string>();
    const strippedTitle = title.replace(/\([^)]*\)/g, '').trim();

    [title, strippedTitle, ...aliases].forEach((candidate) => {
      const normalized = this.normalize(candidate);
      if (normalized) {
        variants.add(normalized);
      }
    });

    return [...variants];
  }

  maskLyrics(lyrics: string, title: string, aliases: string[] = []): string {
    const candidates = [
      title,
      title.replace(/\([^)]*\)/g, '').trim(),
      title.replace(/\s+/g, ''),
      ...aliases,
    ]
      .map((candidate) => candidate.trim())
      .filter(Boolean)
      .sort((left, right) => right.length - left.length);

    let masked = lyrics;
    for (const candidate of candidates) {
      const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(escaped, 'giu');
      masked = masked.replace(pattern, (match) => '•'.repeat(match.length));
    }

    return masked;
  }
}
