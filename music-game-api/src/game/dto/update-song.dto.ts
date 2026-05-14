import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateSongDto {
  @ApiPropertyOptional({ example: '新歌名' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ example: '新歌手' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  artist?: string;

  @ApiPropertyOptional({ example: 'zh-TW', enum: ['zh-TW', 'zh-CN', 'en'] })
  @IsOptional()
  @IsIn(['zh-TW', 'zh-CN', 'en'])
  language?: 'zh-TW' | 'zh-CN' | 'en';

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases?: string[];

  @ApiPropertyOptional({
    example: '還沒到的櫻花 季節早已盛開\nJust a local fallback lyrics block.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  localLyrics?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
