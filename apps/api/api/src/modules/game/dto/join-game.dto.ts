import { IsString, Length, IsOptional } from 'class-validator';

export class JoinGameDto {
  @IsString()
  @Length(3, 12)
  roomId: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  password?: string;
}
