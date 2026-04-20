import 'dotenv/config';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameController } from './game.controller';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { LyricsService } from './lyrics.service';
import { MaskingService } from './masking.service';
import { PersistenceService } from './persistence.service';
import { GamePlayerEntity } from './entities/game-player.entity';
import { GameRoomEntity } from './entities/game-room.entity';
import { GameRoundEntity } from './entities/game-round.entity';
import { GuessEntity } from './entities/guess.entity';
import { LyricsCacheEntity } from './entities/lyrics-cache.entity';
import { SongEntity } from './entities/song.entity';

const databaseEnabled = Boolean(process.env.DATABASE_URL);

@Module({
  imports: [
    ...(databaseEnabled
      ? [
          TypeOrmModule.forFeature([
            SongEntity,
            LyricsCacheEntity,
            GameRoomEntity,
            GamePlayerEntity,
            GameRoundEntity,
            GuessEntity,
          ]),
        ]
      : []),
  ],
  controllers: [GameController],
  providers: [GameService, GameGateway, LyricsService, MaskingService, PersistenceService],
})
export class GameModule {}
