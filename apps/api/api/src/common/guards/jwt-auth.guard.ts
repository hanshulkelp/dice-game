import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticatedUser, AuthError } from '@dice-game/shared-types';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser = AuthenticatedUser>(err: AuthError | null, user: TUser | false): TUser {
    if (err || !user) {
      throw new UnauthorizedException((err as AuthError)?.message ?? 'Invalid or expired token');
    }
    return user;
  }
}