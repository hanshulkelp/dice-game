import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { User } from '../modules/users/user.entity';
import { Game } from '../modules/game/entities/game.entity';
import { GamePlayer } from '../modules/game/entities/game-player.entity';
import { LudoPiece } from '../modules/game/entities/ludo-piece.entity';

export const databaseConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres' as const,
    url: config.get<string>('DATABASE_URL'),
    entities: [User, Game, GamePlayer, LudoPiece],
    migrations: [],
    synchronize: true,
    logging: true,
  }),
};