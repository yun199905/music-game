import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSongDto {
  @ApiProperty({ example: '新歌名' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @ApiProperty({ example: '新歌手' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  artist!: string;

  @ApiProperty({ example: 'zh-TW', enum: ['zh-TW', 'zh-CN', 'en'] })
  @IsIn(['zh-TW', 'zh-CN', 'en'])
  language!: 'zh-TW' | 'zh-CN' | 'en';

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases?: string[];
}
