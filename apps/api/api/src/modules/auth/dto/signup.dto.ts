import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  game_username: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;
}