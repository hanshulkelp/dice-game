import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { GameStatus } from '@dice-game/shared-types';
import { User } from '../../users/user.entity';
import { GamePlayer } from './game-player.entity';

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ unique: true, length: 12 })
  room_id: string;

  @Column({
    type: 'enum',
    enum: GameStatus,
    default: GameStatus.Waiting,
  })
  status: GameStatus;

  @Column({ nullable: true, type: 'uuid' })
  winner_id: string | null;

  /** UUID of the player whose turn it is (null when game not started). */
  @Column({ nullable: true, type: 'varchar', length: 36, name: 'current_turn' })
  current_turn: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'winner_id' })
  winner: User | null;

  @OneToMany(() => GamePlayer, (gp) => gp.game, { cascade: true })
  game_players: GamePlayer[];

  @CreateDateColumn()
  created_at: Date;

  @Column({ nullable: true, type: 'timestamp' })
  finished_at: Date | null;
}
