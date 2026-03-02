import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthError } from '@dice-game/shared-types';

@Injectable()
export class JwtRefreshAuthGuard extends AuthGuard('jwt-refresh') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser>(err: AuthError | null, user: TUser | false): TUser {
    if (err || !user) {
      throw new UnauthorizedException(
        (err as AuthError)?.message ?? 'Invalid or expired refresh token',
      );
    }
    return user;
  }
}
