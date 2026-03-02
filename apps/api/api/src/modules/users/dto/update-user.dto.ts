import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsUrl,
} from 'class-validator';

export class UpdateUserDto {
  /** New display name — 3-50 chars, alphanumeric + underscores only */
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  game_username?: string;

  /** Public avatar URL — must be a valid http/https URL, max 500 chars */
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  avatar_url?: string;
}