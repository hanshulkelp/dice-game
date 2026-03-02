import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';

import { AuthenticatedUser, UserProfile } from '@dice-game/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)   // every route in this controller requires a valid JWT
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /api/users/me
   * Returns the authenticated user's full profile.
   */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  getMe(@CurrentUser() user: AuthenticatedUser): Promise<UserProfile> {
    return this.usersService.getProfile(user.id);
  }

  /**
   * PATCH /api/users/me
   * Partially updates the authenticated user's profile.
   * Accepted fields: game_username, avatar_url.
   */
  @Patch('me')
  @HttpCode(HttpStatus.OK)
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateUserDto,
  ): Promise<UserProfile> {
    return this.usersService.updateProfile(user.id, dto);
  }
}

