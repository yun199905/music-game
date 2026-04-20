import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('game_players')
export class GamePlayerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 8 })
  roomCode!: string;

  @Column({ length: 30 })
  nickname!: string;

  @Column({ default: 0 })
  score!: number;

  @Column({ default: false })
  isHost!: boolean;

  @Column({ default: true })
  connected!: boolean;
}
