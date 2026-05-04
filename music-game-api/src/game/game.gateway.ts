import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import {
  SocketActionDto,
  SocketGuessDto,
  SocketJoinRoomDto,
} from './dto/socket.dto';

@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:4200')
      .split(',')
      .map((origin) => origin.trim()),
    credentials: true,
  },
})
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
  }),
)
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(GameGateway.name);

  constructor(private readonly gameService: GameService) {
    this.gameService.registerBroadcaster((roomCode, event, payload) => {
      void this.server.to(roomCode).emit(event, payload);
    });
  }

  handleConnection(client: Socket) {
    this.logger.log(`Socket connected ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    await this.gameService.detachSocket(client.id);
  }

  @SubscribeMessage('join_room')
  async joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SocketJoinRoomDto,
  ) {
    await client.join(dto.roomCode.toUpperCase());
    const room = await this.gameService.attachSocket(
      dto.roomCode.toUpperCase(),
      dto.playerId,
      client.id,
    );
    this.server.to(dto.roomCode.toUpperCase()).emit('room_state', room);
    return room;
  }

  @SubscribeMessage('leave_room')
  async leaveRoom(@MessageBody() dto: SocketActionDto) {
    const result = await this.gameService.leaveRoom(
      dto.roomCode.toUpperCase(),
      dto.playerId,
    );

    if (!result.roomClosed) {
      return result.room;
    }

    return { roomClosed: true };
  }

  @SubscribeMessage('start_game')
  async startGame(@MessageBody() dto: SocketActionDto) {
    const result = await this.gameService.startGame(
      dto.roomCode.toUpperCase(),
      dto.playerId,
    );
    this.server.to(dto.roomCode.toUpperCase()).emit('room_state', result.room);
    this.server
      .to(dto.roomCode.toUpperCase())
      .emit('round_started', result.round);
    return result.room;
  }

  @SubscribeMessage('submit_guess')
  async submitGuess(@MessageBody() dto: SocketGuessDto) {
    return this.gameService.submitGuess(
      dto.roomCode.toUpperCase(),
      dto.playerId,
      dto.guess,
    );
  }

  @SubscribeMessage('next_round')
  async nextRound(@MessageBody() dto: SocketActionDto) {
    const result = await this.gameService.nextRound(
      dto.roomCode.toUpperCase(),
      dto.playerId,
    );
    this.server.to(dto.roomCode.toUpperCase()).emit('room_state', result.room);

    if (result.gameEnded) {
      this.server
        .to(dto.roomCode.toUpperCase())
        .emit('game_ended', result.room);
      return result.room;
    }

    this.server
      .to(dto.roomCode.toUpperCase())
      .emit('round_started', result.round);
    return result.room;
  }
}
