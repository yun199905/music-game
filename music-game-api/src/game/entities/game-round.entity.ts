import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('game_rounds')
export class GameRoundEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 8 })
  roomCode!: string;

  @Column()
  songId!: string;

  @Column({ length: 120 })
  songTitle!: string;

  @Column({ length: 120 })
  songArtist!: string;

  @Column()
  roundNumber!: number;

  @Column({ nullable: true })
  winnerPlayerId?: string;

  @Column({ type: 'timestamptz' })
  startedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt?: Date;
}
