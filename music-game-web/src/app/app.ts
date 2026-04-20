import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
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
  protected readonly currentPlayer = computed(() =>
    this.leaderboard().find((player) => player.id === this.playerId()) ?? null,
  );

  constructor() {
    this.socket.onRoomState((room) => {
      this.room.set(room);
      this.syncCountdown(room.currentRound);
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
      this.notice.set('Game finished. Final scores are locked.');
    });

    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.tickCountdown());
  }

  protected updateField(
    field: 'nickname' | 'joinCode' | 'answer',
    value: string,
  ) {
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
      this.applySession(session);
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
      this.applySession(session);
      this.notice.set('Joined room. Waiting for the host to start.');
    } catch (error) {
      this.errorMessage.set((error as Error).message);
    }
  }

  protected startGame() {
    const room = this.room();
    const playerId = this.playerId();
    if (!room || !playerId) {
      return;
    }

    this.socket.emitStartGame(room.code, playerId);
  }

  protected nextRound() {
    const room = this.room();
    const playerId = this.playerId();
    if (!room || !playerId) {
      return;
    }

    this.socket.emitNextRound(room.code, playerId);
  }

  protected submitGuess() {
    const room = this.room();
    const playerId = this.playerId();
    const guess = this.answer().trim();
    if (!room || !playerId || !guess) {
      return;
    }

    this.socket.emitGuess(room.code, playerId, guess);
    this.answer.set('');
    this.hasSubmittedCorrectAnswer.set(true);
  }

  protected leaveRoom() {
    this.socket.disconnect();
    this.room.set(null);
    this.playerId.set(null);
    this.answer.set('');
    this.joinCode.set('');
    this.notice.set('Disconnected from room.');
    this.countdown.set(0);
    this.hasSubmittedCorrectAnswer.set(false);
  }

  protected trackPlayer(index: number, player: PlayerSnapshot) {
    return `${index}-${player.id}`;
  }

  private applySession(session: { playerId: string; room: RoomSnapshot }) {
    this.playerId.set(session.playerId);
    this.room.set(session.room);
    this.joinCode.set(session.room.code);
    this.socket.connect(session.room.code, session.playerId);
    this.syncCountdown(session.room.currentRound);
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
}
