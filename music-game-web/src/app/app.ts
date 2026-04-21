import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GameApiService } from './core/game-api.service';
import { GameSocketService } from './core/game-socket.service';
import { PlayerSnapshot, RoomSnapshot, RoundSnapshot } from './core/game.models';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly sessionStorageKey = 'music-game-session';
  private readonly api = inject(GameApiService);
  private readonly socket = inject(GameSocketService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly nickname = signal('');
  protected readonly joinCode = signal('');
  protected readonly answer = signal('');
  protected readonly totalRounds = signal(5);
  protected readonly roundDurationSeconds = signal(30);
  protected readonly room = signal<RoomSnapshot | null>(null);
  protected readonly playerId = signal<string | null>(null);
  protected readonly notice = signal('Create a room or join an existing match to start guessing.');
  protected readonly errorMessage = signal('');
  protected readonly countdown = signal(0);
  protected readonly hasSubmittedCorrectAnswer = signal(false);

  protected readonly isHost = computed(() => this.room()?.hostPlayerId === this.playerId());
  protected readonly currentRound = computed(() => this.room()?.currentRound);
  protected readonly isLobby = computed(() => this.room()?.status === 'lobby');
  protected readonly canStart = computed(
    () => this.isHost() && this.room() !== null && (this.room()?.players.length ?? 0) >= 2,
  );
  protected readonly leaderboard = computed(() => this.room()?.players ?? []);
  protected readonly winner = computed(() => {
    const round = this.currentRound();
    if (!round?.winnerPlayerId) {
      return null;
    }

    return this.leaderboard().find((player) => player.id === round.winnerPlayerId) ?? null;
  });
  protected readonly lyricLines = computed(() =>
    (this.currentRound()?.maskedLyrics ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  );
  protected readonly lyricDuration = computed(() => `${this.room()?.roundDurationSeconds ?? 30}s`);
  protected readonly currentPlayer = computed(
    () => this.leaderboard().find((player) => player.id === this.playerId()) ?? null,
  );

  constructor() {
    this.socket.onRoomState((room) => {
      this.room.set(room);
      this.syncCountdown(room.currentRound);
      this.persistSession();
      if (room.phase === 'revealed') {
        this.hasSubmittedCorrectAnswer.set(false);
      }
    });

    this.socket.onRoundStarted((round) => {
      this.answer.set('');
      this.hasSubmittedCorrectAnswer.set(false);
      this.syncCountdown(round);
      this.notice.set(`Round ${round?.roundNumber ?? 1} started. Lyrics are scrolling now.`);
    });

    this.socket.onRoundEnded((round) => {
      this.syncCountdown(round);
      this.notice.set(
        round?.revealTitle
          ? `Time. The song was "${round.revealTitle}" by ${round.revealArtist ?? 'Unknown artist'}.`
          : 'Time. Waiting for the host to continue.',
      );
    });

    this.socket.onGameEnded((room) => {
      this.room.set(room);
      this.persistSession();
      this.notice.set('Game finished. Final scores are locked.');
    });

    this.socket.onDisconnect(() => {
      if (this.room()) {
        this.notice.set('Connection dropped. Trying to reconnect to the room.');
      }
    });

    this.socket.onReconnect((room) => {
      this.room.set(room);
      this.syncCountdown(room.currentRound);
      this.persistSession();
      this.notice.set(`Reconnected to room ${room.code}.`);
    });

    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.tickCountdown());

    void this.restoreSession();
  }

  protected updateField(field: 'nickname' | 'joinCode' | 'answer', value: string) {
    if (field === 'nickname') {
      this.nickname.set(value);
      return;
    }

    if (field === 'joinCode') {
      this.joinCode.set(value.toUpperCase());
      return;
    }

    this.answer.set(value);
  }

  protected async createRoom() {
    if (!this.nickname().trim()) {
      this.errorMessage.set('Nickname is required.');
      return;
    }

    try {
      this.errorMessage.set('');
      const session = await this.api.createRoom({
        nickname: this.nickname().trim(),
        totalRounds: this.totalRounds(),
        roundDurationSeconds: this.roundDurationSeconds(),
      });
      await this.applySession(session);
      this.notice.set('Room created. Share the code and wait for players.');
    } catch (error) {
      this.errorMessage.set((error as Error).message);
    }
  }

  protected async joinRoom() {
    if (!this.nickname().trim() || !this.joinCode().trim()) {
      this.errorMessage.set('Nickname and room code are required.');
      return;
    }

    try {
      this.errorMessage.set('');
      const session = await this.api.joinRoom(this.joinCode().trim(), this.nickname().trim());
      await this.applySession(session);
      this.notice.set('Joined room. Waiting for the host to start.');
    } catch (error) {
      this.errorMessage.set((error as Error).message);
    }
  }

  protected async startGame() {
    const room = this.room();
    const playerId = this.playerId();
    if (!room || !playerId) {
      return;
    }

    try {
      this.errorMessage.set('');
      await this.socket.emitStartGame(room.code, playerId);
    } catch (error) {
      this.errorMessage.set((error as Error).message);
    }
  }

  protected async nextRound() {
    const room = this.room();
    const playerId = this.playerId();
    if (!room || !playerId) {
      return;
    }

    try {
      this.errorMessage.set('');
      await this.socket.emitNextRound(room.code, playerId);
    } catch (error) {
      this.errorMessage.set((error as Error).message);
    }
  }

  protected async submitGuess() {
    const room = this.room();
    const playerId = this.playerId();
    const guess = this.answer().trim();
    if (!room || !playerId || !guess) {
      return;
    }

    try {
      this.errorMessage.set('');
      const result = await this.socket.emitGuess(room.code, playerId, guess);
      this.answer.set('');
      this.hasSubmittedCorrectAnswer.set(result.correct);
      if (!result.correct) {
        this.notice.set('Not accepted. Keep guessing before the timer ends.');
      }
    } catch (error) {
      this.errorMessage.set((error as Error).message);
    }
  }

  protected leaveRoom() {
    this.socket.disconnect();
    this.room.set(null);
    this.playerId.set(null);
    this.answer.set('');
    this.joinCode.set('');
    this.nickname.set('');
    this.notice.set('Disconnected from room.');
    this.countdown.set(0);
    this.hasSubmittedCorrectAnswer.set(false);
    this.clearSession();
  }

  protected trackPlayer(index: number, player: PlayerSnapshot) {
    return `${index}-${player.id}`;
  }

  private async applySession(session: { playerId: string; room: RoomSnapshot }) {
    this.playerId.set(session.playerId);
    this.room.set(session.room);
    this.nickname.set(
      session.room.players.find((player) => player.id === session.playerId)?.nickname ??
        this.nickname(),
    );
    this.joinCode.set(session.room.code);
    const room = await this.socket.connect(session.room.code, session.playerId);
    this.room.set(room);
    this.persistSession();
    this.syncCountdown(session.room.currentRound);
  }

  private async restoreSession() {
    const session = this.readSession();
    if (!session) {
      return;
    }

    try {
      this.nickname.set(session.nickname);
      this.joinCode.set(session.roomCode);
      this.playerId.set(session.playerId);

      const room = await this.api.getRoom(session.roomCode);
      this.room.set(room);
      const connectedRoom = await this.socket.connect(session.roomCode, session.playerId);
      this.room.set(connectedRoom);
      this.notice.set(`Rejoined room ${session.roomCode}.`);
      this.syncCountdown(connectedRoom.currentRound);
    } catch {
      this.clearSession();
      this.room.set(null);
      this.playerId.set(null);
      this.notice.set('Saved session is no longer valid. Create or join a room again.');
    }
  }

  private syncCountdown(round?: RoundSnapshot) {
    if (!round?.endsAt || round.phase !== 'guessing') {
      this.countdown.set(0);
      return;
    }

    this.countdown.set(
      Math.max(0, Math.ceil((new Date(round.endsAt).getTime() - Date.now()) / 1000)),
    );
  }

  private tickCountdown() {
    const room = this.room();
    const round = room?.currentRound;
    if (!round || room?.phase !== 'guessing') {
      return;
    }

    this.countdown.set(
      Math.max(0, Math.ceil((new Date(round.endsAt).getTime() - Date.now()) / 1000)),
    );
  }

  private persistSession() {
    const room = this.room();
    const playerId = this.playerId();
    if (!room || !playerId) {
      return;
    }

    localStorage.setItem(
      this.sessionStorageKey,
      JSON.stringify({
        roomCode: room.code,
        playerId,
        nickname: this.nickname(),
      }),
    );
  }

  private readSession(): { roomCode: string; playerId: string; nickname: string } | null {
    const raw = localStorage.getItem(this.sessionStorageKey);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as { roomCode?: string; playerId?: string; nickname?: string };
      if (!parsed.roomCode || !parsed.playerId || !parsed.nickname) {
        return null;
      }

      return {
        roomCode: parsed.roomCode,
        playerId: parsed.playerId,
        nickname: parsed.nickname,
      };
    } catch {
      return null;
    }
  }

  private clearSession() {
    localStorage.removeItem(this.sessionStorageKey);
  }
}
