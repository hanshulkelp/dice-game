import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as path from 'path';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { databaseConfig } from '../config/database.config';
import jwtConfig from '../config/jwt.config';
import { AuthModule } from '../modules/auth/auth.module';
import { UsersModule } from '../modules/users/users.module';
import { GameModule } from '../modules/game/game.module';
import { GatewayModule } from '../modules/gateway/gateway.module';

@Module({
  imports: [
    // ── ENV CONFIG ────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.resolve(process.cwd(), 'apps/api/api/.env'),
      load: [jwtConfig],
    }),

    // ── DATABASE ──────────────────────────────────────
    TypeOrmModule.forRootAsync(databaseConfig),

    // ── FEATURE MODULES ───────────────────────────────
    AuthModule,
    UsersModule,
    GameModule,
    GatewayModule,
    // LeaderboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}