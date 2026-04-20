import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateRoomDto } from './dto/create-room.dto';
import { CreateSongDto } from './dto/create-song.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { GameService } from './game.service';

@ApiTags('game')
@Controller()
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post('rooms')
  createRoom(@Body() dto: CreateRoomDto) {
    return this.gameService.createRoom(dto);
  }

  @Post('rooms/:code/join')
  joinRoom(@Param('code') code: string, @Body() dto: JoinRoomDto) {
    return this.gameService.joinRoom(code.toUpperCase(), dto);
  }

  @Get('rooms/:code')
  getRoom(@Param('code') code: string) {
    return this.gameService.getSnapshot(code.toUpperCase());
  }

  @Get('songs')
  listSongs() {
    return this.gameService.listSongs();
  }

  @Post('songs')
  addSong(@Body() dto: CreateSongDto) {
    return this.gameService.addSong(dto);
  }
}
