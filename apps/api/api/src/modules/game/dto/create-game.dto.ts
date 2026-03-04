import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateGameDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  password?: string;
}
