import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigType } from '@nestjs/config';
import { Request } from 'express';
import * as bcrypt from 'bcrypt';
import { AuthenticatedUser, JwtPayload } from '@dice-game/shared-types';
import jwtConfig from '../../../config/jwt.config';
import { User } from '../../users/user.entity';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtConfiguration.refreshSecret,
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: JwtPayload,
  ): Promise<AuthenticatedUser & { refreshToken: string }> {
    const refreshToken = req.headers['authorization']?.split(' ')[1];
    if (!refreshToken) throw new UnauthorizedException('Refresh token missing');

    const user = await this.userRepo.findOne({
      where: { id: payload.sub },
      select: ['id', 'email', 'game_username', 'refresh_token_hash'],
    });

    if (!user || !user.refresh_token_hash) {
      throw new UnauthorizedException('Access denied — please log in again');
    }

    const isMatch = await bcrypt.compare(refreshToken, user.refresh_token_hash);
    if (!isMatch) throw new UnauthorizedException('Refresh token invalid or revoked');

    return { id: user.id, email: user.email, game_username: user.game_username, refreshToken };
  }
}