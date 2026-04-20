import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class JoinRoomDto {
  @ApiProperty({ example: 'Lyric Ninja' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  nickname!: string;
}
