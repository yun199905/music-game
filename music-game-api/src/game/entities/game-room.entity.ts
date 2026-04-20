import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('game_rooms')
export class GameRoomEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, length: 8 })
  roomCode!: string;

  @Column()
  hostPlayerId!: string;

  @Column({ length: 20, default: 'lobby' })
  status!: string;

  @Column({ default: 0 })
  currentRoundIndex!: number;

  @Column({ default: 5 })
  totalRounds!: number;

  @Column({ default: 30 })
  roundDurationSeconds!: number;
}
