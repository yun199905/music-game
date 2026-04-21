import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ example: 'DJ Cat' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  nickname!: string;

  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  totalRounds?: number;

  @ApiPropertyOptional({ example: 30, minimum: 15, maximum: 45 })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(45)
  roundDurationSeconds?: number;
}
