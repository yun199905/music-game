import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GameApiService } from './core/game-api.service';
import { GameSocketService } from './core/game-socket.service';
import {
  CreateSongRequest,
  PlayerSnapshot,
  RoomSnapshot,
  RoundSnapshot,
  SongCatalogItem,
} from './core/game.models';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly defaultNotice = 'Create a room or join an existing match to start guessing.';
  private readonly sessionStorageKey = 'music-game-session';
  private readonly api = inject(GameApiService);
  private readonly socket = inject(GameSocketService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly entryMode = signal<'create' | 'join'>('create');
  protected readonly activeView = signal<'game' | 'ranking' | 'catalog'>('game');
  protected readonly menuOpen = signal(false);
  protected readonly nickname = signal('');
  protected readonly joinCode = signal('');
  protected readonly answer = signal('');
  protected readonly totalRounds = signal(5);
  protected readonly roundDurationSeconds = signal(30);
  protected readonly room = signal<RoomSnapshot | null>(null);
  protected readonly playerId = signal<string | null>(null);
  protected readonly notice = signal(this.defaultNotice);
  protected readonly errorMessage = signal('');
  protected readonly countdown = signal(0);
  protected readonly hasSubmittedCorrectAnswer = signal(false);
  protected readonly catalogOpen = signal(true);
  protected readonly catalogLoading = signal(false);
  protected readonly catalogSaving = signal(false);
  protected readonly catalogMessage = signal('Catalog tools are ready for quick song maintenance.');
  protected readonly catalogError = signal('');
  protected readonly catalogSongs = signal<SongCatalogItem[]>([]);
  protected readonly songTitle = signal('');
  protected readonly songArtist = signal('');
  protected readonly songLanguage = signal<'zh-TW' | 'zh-CN' | 'en'>('en');
  protected readonly songAliases = signal('');
  protected readonly songLocalLyrics = signal('');

  protected readonly isHost = computed(() => this.room()?.hostPlayerId === this.playerId());
  protected readonly currentRound = computed(() => this.room()?.currentRound);
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
  protected readonly scene = computed(() => {
    const room = this.room();
    if (!room) {
      return 'lobby';
    }

    if (room.status === 'finished') {
      return 'finished';
    }

    if (room.phase === 'revealed') {
      return 'revealed';
    }

    if (room.phase === 'guessing') {
      return 'guessing';
    }

    return 'lobby';
  });
  protected readonly canonicalRoomCode = computed(() => this.room()?.code ?? '');
  protected readonly currentViewTitle = computed(() => {
    switch (this.activeView()) {
      case 'ranking':
        return 'Live room ranking';
      case 'catalog':
        return 'Song maintenance';
      default:
        return 'Gameplay';
    }
  });

  constructor() {
    this.socket.onRoomState((room) => {
      this.syncRoomState(room);
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
      this.syncRoomState(room);
      this.notice.set('Game finished. Final scores are locked.');
    });

    this.socket.onDisconnect(() => {
      if (this.room()) {
        this.notice.set('Connection dropped. Trying to reconnect to the room.');
      }
    });

    this.socket.onReconnect((room) => {
      this.syncRoomState(room);
      this.notice.set(`Reconnected to room ${room.code}.`);
    });

    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.tickCountdown());

    void this.loadSongs();
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

  protected updateSongField(
    field: 'title' | 'artist' | 'language' | 'aliases' | 'localLyrics',
    value: string,
  ) {
    if (field === 'title') {
      this.songTitle.set(value);
      return;
    }

    if (field === 'artist') {
      this.songArtist.set(value);
      return;
    }

    if (field === 'language') {
      this.songLanguage.set(value as 'zh-TW' | 'zh-CN' | 'en');
      return;
    }

    if (field === 'aliases') {
      this.songAliases.set(value);
      return;
    }

    this.songLocalLyrics.set(value);
  }

  protected setEntryMode(mode: 'create' | 'join') {
    this.entryMode.set(mode);
    this.activeView.set('game');
    this.menuOpen.set(false);
    this.errorMessage.set('');
  }

  protected toggleMenu() {
    this.menuOpen.update((open) => !open);
  }

  protected openView(view: 'game' | 'ranking' | 'catalog') {
    this.activeView.set(view);
    this.menuOpen.set(false);
  }

  protected openLandingView(mode: 'create' | 'join' | 'catalog') {
    if (mode === 'catalog') {
      this.activeView.set('catalog');
    } else {
      this.entryMode.set(mode);
      this.activeView.set('game');
    }
    this.menuOpen.set(false);
    this.errorMessage.set('');
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
      this.entryMode.set('create');
      this.notice.set(
        `Room ${this.canonicalRoomCode()} created. Share the code and wait for players.`,
      );
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
      const requestedRoomCode = this.joinCode().trim().toUpperCase();
      const session = await this.api.joinRoom(requestedRoomCode, this.nickname().trim());
      await this.applySession(session);
      this.entryMode.set('join');
      this.notice.set(`Joined room ${this.canonicalRoomCode()}. Waiting for the host to start.`);
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
    this.activeView.set('game');
    this.menuOpen.set(false);
    this.notice.set('Disconnected from room.');
    this.countdown.set(0);
    this.hasSubmittedCorrectAnswer.set(false);
    this.clearSession();
  }

  protected toggleCatalog() {
    this.catalogOpen.update((open) => !open);
  }

  protected async copyRoomCode() {
    const roomCode = this.canonicalRoomCode();
    if (!roomCode) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(roomCode);
      } else {
        this.copyUsingTextarea(roomCode);
      }

      this.notice.set(`Room code ${roomCode} copied.`);
    } catch {
      this.errorMessage.set('Unable to copy the room code automatically.');
    }
  }

  protected async submitSong() {
    const title = this.songTitle().trim();
    const artist = this.songArtist().trim();
    const language = this.songLanguage();
    const localLyrics = this.songLocalLyrics().trim();

    if (!title || !artist) {
      this.catalogError.set('Song title and artist are required.');
      return;
    }

    if (language.startsWith('zh') && !localLyrics) {
      this.catalogError.set('Chinese songs must include local lyrics so rounds stay playable.');
      return;
    }

    const payload: CreateSongRequest = {
      title,
      artist,
      language,
      aliases: this.songAliases()
        .split(/[\n,]/)
        .map((alias) => alias.trim())
        .filter(Boolean),
      localLyrics: localLyrics || undefined,
    };

    try {
      this.catalogSaving.set(true);
      this.catalogError.set('');
      const song = await this.api.createSong(payload);
      this.catalogSongs.update((songs) =>
        [...songs, song].sort(
          (left, right) =>
            left.artist.localeCompare(right.artist) || left.title.localeCompare(right.title),
        ),
      );
      this.songTitle.set('');
      this.songArtist.set('');
      this.songAliases.set('');
      this.songLocalLyrics.set('');
      this.catalogMessage.set(`Saved ${song.title} by ${song.artist} to the playable catalog.`);
    } catch (error) {
      this.catalogError.set((error as Error).message);
    } finally {
      this.catalogSaving.set(false);
    }
  }

  protected trackPlayer(index: number, player: PlayerSnapshot) {
    return `${index}-${player.id}`;
  }

  protected trackSong(index: number, song: SongCatalogItem) {
    return `${index}-${song.id}`;
  }

  private async applySession(session: { playerId: string; room: RoomSnapshot }) {
    this.playerId.set(session.playerId);
    this.nickname.set(
      session.room.players.find((player) => player.id === session.playerId)?.nickname ??
        this.nickname(),
    );
    this.joinCode.set(session.room.code);
    this.activeView.set('game');
    this.menuOpen.set(false);
    this.syncRoomState(session.room);
    const room = await this.socket.connect(session.room.code, session.playerId);
    this.syncRoomState(room);
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
      this.syncRoomState(room);
      const connectedRoom = await this.socket.connect(room.code, session.playerId);
      this.syncRoomState(connectedRoom);
      this.activeView.set('game');
      this.menuOpen.set(false);
      this.notice.set(`Rejoined room ${connectedRoom.code}.`);
    } catch {
      this.clearSession();
      this.room.set(null);
      this.playerId.set(null);
      this.notice.set('Saved session is no longer valid. Create or join a room again.');
    }
  }

  private async loadSongs() {
    try {
      this.catalogLoading.set(true);
      this.catalogError.set('');
      const songs = await this.api.listSongs();
      this.catalogSongs.set(songs);
    } catch (error) {
      this.catalogError.set((error as Error).message);
    } finally {
      this.catalogLoading.set(false);
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

  private syncRoomState(room: RoomSnapshot) {
    this.room.set(room);
    this.joinCode.set(room.code);
    this.syncCountdown(room.currentRound);
    this.persistSession();
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

  private copyUsingTextarea(value: string) {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}
