import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '@dice-game/shared-types';

/**
 * Route parameter decorator that pulls the authenticated user from the
 * Passport-populated `req.user` object.
 *
 * Usage:
 *   @Get('me')
 *   @UseGuards(JwtAuthGuard)
 *   getMe(@CurrentUser() user: AuthenticatedUser) { ... }
 *
 * An optional key string can be passed to extract a single field:
 *   @CurrentUser('id')  →  req.user.id
 */
export const CurrentUser = createParamDecorator(
  (key: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    const user = request.user;
    return key ? user?.[key] : user;
  },
);
