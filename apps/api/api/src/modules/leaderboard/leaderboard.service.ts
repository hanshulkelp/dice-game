import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { LeaderboardEntry } from '@dice-game/shared-types';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getTop10(): Promise<LeaderboardEntry[]> {
    const rows = await this.userRepo
      .createQueryBuilder('u')
      .select([
        'u.game_username AS "gameUsername"',
        'u.total_games   AS "totalGames"',
        'u.total_wins    AS "totalWins"',
      ])
      .orderBy('u.total_wins', 'DESC')
      .addOrderBy('u.total_games', 'ASC')   // tiebreak: fewer games = more efficient
      .limit(10)
      .getRawMany<{ gameUsername: string; totalGames: string; totalWins: string }>();

    return rows.map((r, i) => ({
      rank:         i + 1,
      gameUsername: r.gameUsername,
      totalGames:   Number(r.totalGames),
      totalWins:    Number(r.totalWins),
    }));
  }
}
