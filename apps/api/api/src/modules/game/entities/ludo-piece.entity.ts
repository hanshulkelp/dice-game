import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Game } from './game.entity';
import { User } from '../../users/user.entity';

@Entity('ludo_pieces')
@Index('IDX_ludo_pieces_game_id', ['gameId'])
export class LudoPiece {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'game_id', type: 'uuid' })
  gameId: string;

  @ManyToOne(() => Game, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_id' })
  game: Game;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'piece_id', length: 10 })
  pieceId: string;

  @Column({ default: 0 })
  position: number;

  @Column({ length: 10, default: 'home' })
  status: string;
}
