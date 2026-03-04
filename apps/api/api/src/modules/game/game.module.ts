import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Game } from './entities/game.entity';
import { GamePlayer } from './entities/game-player.entity';
import { LudoPiece } from './entities/ludo-piece.entity';
import { User } from '../users/user.entity';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { LudoLogicService } from './ludo-logic.service';

@Module({
  imports: [TypeOrmModule.forFeature([Game, GamePlayer, LudoPiece, User])],
  controllers: [GameController],
  providers: [GameService, LudoLogicService],
  exports: [GameService, LudoLogicService],
})
export class GameModule {}