import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { SignupResponse, LoginResponse, RefreshResponse } from '@dice-game/shared-types';
import jwtConfig from '../../config/jwt.config';
import { ConfigType } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 10;

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  // POST /api/auth/signup
  async signup(dto: SignupDto): Promise<SignupResponse> {
    // 1. Check email uniqueness
    const emailExists = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (emailExists) {
      throw new ConflictException('Email is already registered');
    }

    // 2. Check game_username uniqueness
    const usernameExists = await this.userRepo.findOne({
      where: { game_username: dto.game_username },
    });
    if (usernameExists) {
      throw new ConflictException('Username is already taken');
    }

    // 3. Hash password
    const password_hash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // 4. Create and save user
    try {
      const user = this.userRepo.create({
        email: dto.email,
        game_username: dto.game_username,
        password_hash,
      });

      const saved = await this.userRepo.save(user);

      // 5. Return safe user data (never return password_hash)
      return {
        id: saved.id,
        email: saved.email,
        game_username: saved.game_username,
        created_at: saved.created_at,
      };
    } catch (error) {
      this.logger.error('Signup failed', error);
      throw new InternalServerErrorException('Could not create account');
    }
  }

  // POST /api/auth/login
  async login(dto: LoginDto): Promise<LoginResponse> {
    // 1. Find user by email
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      // explicitly select password_hash since it might be excluded by default
      select: [
        'id',
        'email',
        'game_username',
        'password_hash',
        'avatar_url',
        'total_games',
        'total_wins',
      ],
    });

    // 2. Always use same error message to prevent email enumeration
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 3. Compare password
    const isMatch = await bcrypt.compare(dto.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 4. Sign access + refresh tokens
    const payload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload);
    const refresh_token = this.jwtService.sign(payload, {
      secret: this.jwtConfiguration.refreshSecret,
      expiresIn: this.jwtConfiguration.refreshExpiresIn,
    });

    // 5. Hash and store refresh token
    const refresh_token_hash = await bcrypt.hash(refresh_token, this.SALT_ROUNDS);
    await this.userRepo.update(user.id, { refresh_token_hash });

    // 6. Return tokens + safe user info
    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        email: user.email,
        game_username: user.game_username,
        avatar_url: user.avatar_url,
        total_games: user.total_games,
        total_wins: user.total_wins,
      },
    };
  }

  // POST /api/auth/refresh
  async refreshTokens(userId: string): Promise<RefreshResponse> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'email'],
    });
    if (!user) throw new UnauthorizedException('User not found');

    const payload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload);
    const refresh_token = this.jwtService.sign(payload, {
      secret: this.jwtConfiguration.refreshSecret,
      expiresIn: this.jwtConfiguration.refreshExpiresIn,
    });

    // Rotate: store new hash, old token is immediately invalidated
    const refresh_token_hash = await bcrypt.hash(refresh_token, this.SALT_ROUNDS);
    await this.userRepo.update(user.id, { refresh_token_hash });

    return { access_token, refresh_token };
  }

  // POST /api/auth/logout
  async logout(userId: string): Promise<void> {
    // Nullify stored hash — renders any existing refresh token unusable
    await this.userRepo.update(userId, { refresh_token_hash: null });
  }
}