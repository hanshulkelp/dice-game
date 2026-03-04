import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@dice-game/shared-types';
import { GameService } from './game.service';
import { JoinGameDto } from './dto/join-game.dto';

@Controller('game')
@UseGuards(JwtAuthGuard)
export class GameController {
  constructor(private readonly gameService: GameService) {}

  /** POST /api/game/create — create a new room */
  @Post('create')
  create(@CurrentUser() user: AuthenticatedUser) {
    return this.gameService.createGame(user.id);
  }

  /** POST /api/game/join — join an existing room */
  @Post('join')
  join(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: JoinGameDto,
  ) {
    return this.gameService.joinGame(user.id, dto.roomId);
  }

  /** GET /api/game/:roomId — fetch live room state */
  @Get(':roomId')
  getRoom(@Param('roomId') roomId: string) {
    return this.gameService.getRoomState(roomId);
  }
}
