import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import jwtConfig from '../../config/jwt.config';
import { GameModule } from '../game/game.module';
import { GameGateway } from './game.gateway';

@Module({
  imports: [
    GameModule,
    JwtModule.registerAsync({
      imports: [ConfigModule.forFeature(jwtConfig)],
      inject: [jwtConfig.KEY],
      useFactory: (cfg: ConfigType<typeof jwtConfig>) => ({
        secret: cfg.secret,
        signOptions: { expiresIn: cfg.expiresIn },
      }),
    }),
  ],
  providers: [GameGateway],
  exports: [GameGateway],
})
export class GatewayModule {}