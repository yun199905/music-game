import { Injectable } from '@angular/core';
import { Socket, io } from 'socket.io-client';
import { appConfigValues } from './app-config';
import { RoomSnapshot, RoundSnapshot } from './game.models';

type RoomListener = (room: RoomSnapshot) => void;
type RoundListener = (round: RoundSnapshot | undefined) => void;

@Injectable({ providedIn: 'root' })
export class GameSocketService {
  private socket?: Socket;
  private roomListener?: RoomListener;
  private roundStartedListener?: RoundListener;
  private roundEndedListener?: RoundListener;
  private gameEndedListener?: RoomListener;

  connect(roomCode: string, playerId: string) {
    if (!this.socket) {
      this.socket = io(appConfigValues.wsBaseUrl, {
        transports: ['websocket'],
      });

      this.socket.on('room_state', (room: RoomSnapshot) => this.roomListener?.(room));
      this.socket.on('round_started', (round: RoundSnapshot) => this.roundStartedListener?.(round));
      this.socket.on('round_ended', (round: RoundSnapshot) => this.roundEndedListener?.(round));
      this.socket.on('game_ended', (room: RoomSnapshot) => this.gameEndedListener?.(room));
    }

    this.socket.emit('join_room', { roomCode, playerId });
  }

  onRoomState(listener: RoomListener) {
    this.roomListener = listener;
  }

  onRoundStarted(listener: RoundListener) {
    this.roundStartedListener = listener;
  }

  onRoundEnded(listener: RoundListener) {
    this.roundEndedListener = listener;
  }

  onGameEnded(listener: RoomListener) {
    this.gameEndedListener = listener;
  }

  emitStartGame(roomCode: string, playerId: string) {
    this.socket?.emit('start_game', { roomCode, playerId });
  }

  emitNextRound(roomCode: string, playerId: string) {
    this.socket?.emit('next_round', { roomCode, playerId });
  }

  emitGuess(roomCode: string, playerId: string, guess: string) {
    this.socket?.emit('submit_guess', { roomCode, playerId, guess });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = undefined;
  }
}
