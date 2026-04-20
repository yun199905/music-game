import 'dotenv/config';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { DbHealthService } from './db-health.service';
import { GameModule } from './game/game.module';
import { GamePlayerEntity } from './game/entities/game-player.entity';
import { GameRoomEntity } from './game/entities/game-room.entity';
import { GameRoundEntity } from './game/entities/game-round.entity';
import { GuessEntity } from './game/entities/guess.entity';
import { LyricsCacheEntity } from './game/entities/lyrics-cache.entity';
import { SongEntity } from './game/entities/song.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const sslEnabled = configService.get<string>('DB_SSL') === 'true';

        if (!databaseUrl) {
          return {
            type: 'postgres' as const,
            autoLoadEntities: true,
            synchronize: false,
            entities: [],
          };
        }

        return {
          type: 'postgres' as const,
          url: databaseUrl,
          autoLoadEntities: true,
          synchronize: true,
          ssl: sslEnabled ? { rejectUnauthorized: false } : false,
          connectTimeoutMS: 10000,
          entities: [
            SongEntity,
            LyricsCacheEntity,
            GameRoomEntity,
            GamePlayerEntity,
            GameRoundEntity,
            GuessEntity,
          ],
        };
      },
    }),
    GameModule,
  ],
  controllers: [AppController],
  providers: [DbHealthService],
})
export class AppModule {}
