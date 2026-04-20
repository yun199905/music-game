import { IsString, MaxLength, MinLength } from 'class-validator';

export class SocketJoinRoomDto {
  @IsString()
  @MinLength(4)
  @MaxLength(8)
  roomCode!: string;

  @IsString()
  playerId!: string;
}

export class SocketActionDto {
  @IsString()
  @MinLength(4)
  @MaxLength(8)
  roomCode!: string;

  @IsString()
  playerId!: string;
}

export class SocketGuessDto extends SocketActionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  guess!: string;
}
