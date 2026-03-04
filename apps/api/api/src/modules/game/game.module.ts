import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Game } from './entities/game.entity';
import { GamePlayer } from './entities/game-player.entity';
import { User } from '../users/user.entity';
import { GameController } from './game.controller';
import { GameService } from './game.service';

@Module({
  imports: [TypeOrmModule.forFeature([Game, GamePlayer, User])],
  controllers: [GameController],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}