import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('songs')
export class SongEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 120 })
  title!: string;

  @Column({ length: 120 })
  artist!: string;

  @Column({ length: 10, default: 'zh-TW' })
  language!: string;

  @Column({ default: true })
  enabled!: boolean;

  @Column({ type: 'simple-json', nullable: true })
  aliases?: string[];
}
