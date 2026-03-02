import { Injectable } from '@nestjs/common';

@Injectable()
export class GameService {
	status() {
		return { module: 'game', status: 'ok' };
	}
}
