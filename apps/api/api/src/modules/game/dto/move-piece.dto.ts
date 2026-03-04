import { IsNotEmpty, IsString } from 'class-validator';

export class MovePieceDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  pieceId: string;
}
