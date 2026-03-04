import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ length: 255 })
  password_hash: string;

  @Column({ unique: true, length: 50 })
  game_username: string;

  @Column({ nullable: true, length: 500 })
  avatar_url: string;

  @Column({ default: 0 })
  total_games: number;

  @Index('IDX_users_total_wins')
  @Column({ default: 0 })
  total_wins: number;

  // ← NEW: store hashed refresh token
  @Column({ nullable: true, length: 500 })
  refresh_token_hash: string | null;

  @CreateDateColumn()
  created_at: Date;
}