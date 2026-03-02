import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtRefreshAuthGuard } from '../../common/guards/jwt-refresh-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SignupResponse, LoginResponse, RefreshResponse, AuthenticatedUser } from '@dice-game/shared-types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /api/auth/signup
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  signup(@Body() dto: SignupDto): Promise<SignupResponse> {
    return this.authService.signup(dto);
  }

  // POST /api/auth/login
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(dto);
  }

  // POST /api/auth/refresh  — send refresh_token in Authorization: Bearer header
  @UseGuards(JwtRefreshAuthGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Request() req: { user: AuthenticatedUser }): Promise<RefreshResponse> {
    return this.authService.refreshTokens(req.user.id);
  }

  // POST /api/auth/logout  — requires valid access token
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Request() req: { user: AuthenticatedUser }): Promise<void> {
    return this.authService.logout(req.user.id);
  }
}