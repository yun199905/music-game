import { Injectable } from '@angular/core';
import { Socket, io } from 'socket.io-client';
import { appConfigValues } from './app-config';
import { RoomSnapshot, RoundSnapshot } from './game.models';

type RoomListener = (room: RoomSnapshot) => void;
type RoundListener = (round: RoundSnapshot | undefined) => void;
type DisconnectListener = (reason: string) => void;
type ReconnectListener = (room: RoomSnapshot) => void;
type GuessAck = {
  room: RoomSnapshot;
  correct: boolean;
  playerId?: string;
  score?: number;
};

@Injectable({ providedIn: 'root' })
export class GameSocketService {
  private readonly defaultAckTimeoutMs = 5000;
  private readonly roomActionAckTimeoutMs = 20000;
  private socket?: Socket;
  private roomListener?: RoomListener;
  private roundStartedListener?: RoundListener;
  private roundEndedListener?: RoundListener;
  private gameEndedListener?: RoomListener;
  private disconnectListener?: DisconnectListener;
  private reconnectListener?: ReconnectListener;
  private activeSession?: {
    roomCode: string;
    playerId: string;
  };
  private reconnecting = false;

  async connect(roomCode: string, playerId: string): Promise<RoomSnapshot> {
    this.activeSession = { roomCode, playerId };
    return this.emitWithAck<RoomSnapshot>('join_room', { roomCode, playerId });
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

  onDisconnect(listener: DisconnectListener) {
    this.disconnectListener = listener;
  }

  onReconnect(listener: ReconnectListener) {
    this.reconnectListener = listener;
  }

  emitStartGame(roomCode: string, playerId: string) {
    return this.emitWithAck<RoomSnapshot>(
      'start_game',
      { roomCode, playerId },
      this.roomActionAckTimeoutMs,
    );
  }

  emitNextRound(roomCode: string, playerId: string) {
    return this.emitWithAck<RoomSnapshot>(
      'next_round',
      { roomCode, playerId },
      this.roomActionAckTimeoutMs,
    );
  }

  emitGuess(roomCode: string, playerId: string, guess: string) {
    return this.emitWithAck<GuessAck>('submit_guess', { roomCode, playerId, guess });
  }

  disconnect() {
    this.activeSession = undefined;
    this.reconnecting = false;
    this.socket?.disconnect();
    this.socket = undefined;
  }

  private createSocket() {
    if (this.socket) {
      return this.socket;
    }

    this.socket = io(appConfigValues.wsBaseUrl, {
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('room_state', (room: RoomSnapshot) => this.roomListener?.(room));
    this.socket.on('round_started', (round: RoundSnapshot) => this.roundStartedListener?.(round));
    this.socket.on('round_ended', (round: RoundSnapshot) => this.roundEndedListener?.(round));
    this.socket.on('game_ended', (room: RoomSnapshot) => this.gameEndedListener?.(room));
    this.socket.on('disconnect', (reason) => this.disconnectListener?.(reason));
    this.socket.on('reconnect', () => {
      void this.rejoinActiveSession();
    });

    return this.socket;
  }

  private async ensureConnected(): Promise<Socket> {
    const socket = this.createSocket();
    if (socket.connected) {
      return socket;
    }

    return new Promise<Socket>((resolve, reject) => {
      const handleConnect = () => {
        cleanup();
        resolve(socket);
      };

      const handleError = (error: Error) => {
        cleanup();
        reject(this.normalizeError(error));
      };

      const cleanup = () => {
        socket.off('connect', handleConnect);
        socket.off('connect_error', handleError);
      };

      socket.on('connect', handleConnect);
      socket.on('connect_error', handleError);
      socket.connect();
    });
  }

  private async emitWithAck<T>(event: string, payload: unknown, timeoutMs = this.defaultAckTimeoutMs): Promise<T> {
    const socket = await this.ensureConnected();

    try {
      return (await socket.timeout(timeoutMs).emitWithAck(event, payload)) as T;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  private normalizeError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }

    if (typeof error === 'string') {
      return new Error(error);
    }

    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as { message?: string | string[] }).message;
      if (Array.isArray(message)) {
        return new Error(message.join(', '));
      }

      if (typeof message === 'string') {
        return new Error(message);
      }
    }

    return new Error('Socket request failed');
  }

  private async rejoinActiveSession() {
    if (!this.activeSession || this.reconnecting) {
      return;
    }

    this.reconnecting = true;
    try {
      const room = await this.emitWithAck<RoomSnapshot>('join_room', this.activeSession);
      this.reconnectListener?.(room);
    } catch (error) {
      this.disconnectListener?.((error as Error).message);
    } finally {
      this.reconnecting = false;
    }
  }
}
