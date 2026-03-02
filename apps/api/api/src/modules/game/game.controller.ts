import { Controller, Get } from '@nestjs/common';

import { GameService } from './game.service';

@Controller('game')
export class GameController {
	constructor(private readonly gameService: GameService) {}

	@Get('status')
	getStatus() {
		return this.gameService.status();
	}
}
