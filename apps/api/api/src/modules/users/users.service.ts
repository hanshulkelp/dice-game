import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserProfile } from '@dice-game/shared-types';
import { User } from './user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  // ── Internal ─────────────────────────────────────────────────────────────

  /** Find a raw user row by ID (used internally by other modules). */
  async findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  // ── Public profile helpers ────────────────────────────────────────────────

  /**
   * Return the safe public profile for a user.
   * Throws 404 when the user no longer exists (edge case: deleted account).
   */
  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.toProfile(user);
  }

  /**
   * Apply allowed field updates and return the refreshed profile.
   *
   * - `game_username` uniqueness is enforced before saving.
   * - Password change is intentionally excluded here (own endpoint later).
   * - Fields missing from the DTO are ignored (partial update).
   */
  async updateProfile(
    userId: string,
    dto: UpdateUserDto,
  ): Promise<UserProfile> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Guard against username collisions
    if (dto.game_username && dto.game_username !== user.game_username) {
      const taken = await this.usersRepo.findOne({
        where: { game_username: dto.game_username },
      });
      if (taken) {
        throw new ConflictException('Username is already taken');
      }
      user.game_username = dto.game_username;
    }

    if (dto.avatar_url !== undefined) {
      user.avatar_url = dto.avatar_url;
    }

    const saved = await this.usersRepo.save(user);
    return this.toProfile(saved);
  }

  // ── Status ────────────────────────────────────────────────────────────────

  status() {
    return { module: 'users', status: 'ok' };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private toProfile(user: User): UserProfile {
    return {
      id: user.id,
      email: user.email,
      game_username: user.game_username,
      avatar_url: user.avatar_url ?? null,
      total_games: user.total_games,
      total_wins: user.total_wins,
    };
  }
}

