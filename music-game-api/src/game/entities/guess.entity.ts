import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('guesses')
export class GuessEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  roundId!: string;

  @Column({ length: 8 })
  roomCode!: string;

  @Column()
  playerId!: string;

  @Column({ length: 120 })
  guessText!: string;

  @Column({ length: 120 })
  normalizedGuess!: string;

  @Column({ default: false })
  isCorrect!: boolean;

  @Column({ type: 'timestamptz' })
  submittedAt!: Date;
}
