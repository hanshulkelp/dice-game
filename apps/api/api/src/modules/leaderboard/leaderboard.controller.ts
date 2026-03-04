import { Controller, Get } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardEntry } from '@dice-game/shared-types';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  getTop10(): Promise<LeaderboardEntry[]> {
    return this.leaderboardService.getTop10();
  }
}
