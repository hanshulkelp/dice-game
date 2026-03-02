import { Injectable } from '@nestjs/common';

@Injectable()
export class LeaderboardService {
	status() {
		return { module: 'leaderboard', status: 'ok' };
	}
}
