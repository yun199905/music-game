import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('lyrics_cache')
export class LyricsCacheEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  songId!: string;

  @Column({ length: 50 })
  provider!: string;

  @Column({ type: 'text' })
  rawLyrics!: string;

  @Column({ type: 'text' })
  maskedLyrics!: string;

  @Column({ type: 'timestamptz' })
  cachedAt!: Date;
}
