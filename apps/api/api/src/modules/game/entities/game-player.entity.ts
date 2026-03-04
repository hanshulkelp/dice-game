import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Game } from './game.entity';
import { User } from '../../users/user.entity';

@Entity('game_players')
@Index('IDX_game_players_game_id', ['game'])
export class GamePlayer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Game, (g) => g.game_players, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_id' })
  game: Game;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ default: 0 })
  position: number;

  @Column({ nullable: true, type: 'int' })
  rank: number | null;

  @CreateDateColumn()
  joined_at: Date;
}
