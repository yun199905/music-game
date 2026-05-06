import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { App } from './app';
import { GameApiService } from './core/game-api.service';
import { GameSocketService } from './core/game-socket.service';
import { RoomSnapshot, SongCatalogItem } from './core/game.models';

describe('App', () => {
  const emptyCatalog: SongCatalogItem[] = [];
  const roomSnapshot: RoomSnapshot = {
    code: 'ROOM1',
    status: 'lobby',
    phase: 'idle',
    hostPlayerId: 'player-1',
    totalRounds: 5,
    roundDurationSeconds: 30,
    currentRoundIndex: 0,
    maxPlayers: 8,
    players: [
      {
        id: 'player-1',
        nickname: 'Host',
        score: 0,
        isHost: true,
        connected: true,
      },
    ],
  };

  let apiMock: {
    createRoom: ReturnType<typeof vi.fn>;
    joinRoom: ReturnType<typeof vi.fn>;
    getRoom: ReturnType<typeof vi.fn>;
    listSongs: ReturnType<typeof vi.fn>;
    createSong: ReturnType<typeof vi.fn>;
  };
  let socketMock: {
    connect: ReturnType<typeof vi.fn>;
    emitStartGame: ReturnType<typeof vi.fn>;
    emitNextRound: ReturnType<typeof vi.fn>;
    emitGuess: ReturnType<typeof vi.fn>;
    emitLeaveRoom: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    onRoomState: ReturnType<typeof vi.fn>;
    onRoundStarted: ReturnType<typeof vi.fn>;
    onRoundEnded: ReturnType<typeof vi.fn>;
    onGameEnded: ReturnType<typeof vi.fn>;
    onDisconnect: ReturnType<typeof vi.fn>;
    onReconnect: ReturnType<typeof vi.fn>;
    onRoomClosed: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    localStorage.clear();
    apiMock = {
      createRoom: vi.fn(),
      joinRoom: vi.fn(),
      getRoom: vi.fn().mockResolvedValue(roomSnapshot),
      listSongs: vi.fn().mockResolvedValue(emptyCatalog),
      createSong: vi.fn(),
    };
    socketMock = {
      connect: vi.fn().mockResolvedValue(roomSnapshot),
      emitStartGame: vi.fn(),
      emitNextRound: vi.fn(),
      emitGuess: vi.fn(),
      emitLeaveRoom: vi.fn(),
      disconnect: vi.fn(),
      onRoomState: vi.fn(),
      onRoundStarted: vi.fn(),
      onRoundEnded: vi.fn(),
      onGameEnded: vi.fn(),
      onDisconnect: vi.fn(),
      onReconnect: vi.fn(),
      onRoomClosed: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: GameApiService, useValue: apiMock as unknown as GameApiService },
        { provide: GameSocketService, useValue: socketMock as unknown as GameSocketService },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the main hero copy', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Multiplayer lyrics guessing');
  });

  it('shows create mode fields by default and hides the room code input', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Start a new room');
    expect(compiled.textContent).not.toContain('Room Code');
  });

  it('shows the room code input after switching to join mode', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    const joinModeButton = buttons.find((button) => button.textContent?.includes('Join Room'));
    joinModeButton?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Join an existing room');
    expect(compiled.textContent).toContain('Room Code');
  });

  it('renders the active room header from the room snapshot code', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as unknown as {
      joinCode: {
        (): string;
        set: (value: string) => void;
      };
      room: {
        set: (value: RoomSnapshot) => void;
      };
    };

    app.joinCode.set('WRONG');
    app.room.set(roomSnapshot);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('ROOM1');
    expect(compiled.textContent).not.toContain('WRONG');
  });

  it('normalizes the stored join code to the connected room snapshot during applySession', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as unknown as {
      joinCode: {
        (): string;
      };
      applySession: (session: { playerId: string; room: RoomSnapshot }) => Promise<void>;
    };

    socketMock.connect.mockResolvedValue({ ...roomSnapshot, code: 'ROOM1' });

    await app.applySession({
      playerId: 'player-1',
      room: { ...roomSnapshot, code: 'room1' },
    });

    expect(app.joinCode()).toBe('ROOM1');
  });

  it('copies the active room code through the clipboard API', async () => {
    const fixture = TestBed.createComponent(App);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const app = fixture.componentInstance as unknown as {
      room: { set: (value: RoomSnapshot) => void };
      copyRoomCode: () => Promise<void>;
    };

    app.room.set(roomSnapshot);
    await app.copyRoomCode();

    expect(writeText).toHaveBeenCalledWith('ROOM1');
  });

  it('switches active room content through the menu views', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as unknown as {
      room: { set: (value: RoomSnapshot) => void };
      activeView: { set: (value: 'game' | 'ranking' | 'catalog') => void };
    };

    app.room.set(roomSnapshot);
    app.activeView.set('ranking');
    fixture.detectChanges();
    await fixture.whenStable();

    let compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Live room ranking');
    expect(compiled.textContent).not.toContain('Song maintenance');

    app.activeView.set('catalog');
    fixture.detectChanges();
    await fixture.whenStable();

    compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Song maintenance');
    expect(compiled.textContent).not.toContain('Live room ranking');
  });

  it('opens song maintenance from the homepage menu before joining a room', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as unknown as {
      openLandingView: (mode: 'create' | 'join' | 'catalog') => void;
    };

    app.openLandingView('catalog');
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Song maintenance');
    expect(compiled.textContent).not.toContain('Start a new room');
  });

  it('only allows the host to start when at least two players are connected', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as unknown as {
      room: { set: (value: RoomSnapshot) => void };
      playerId: { set: (value: string) => void };
      canStart: () => boolean;
    };

    app.playerId.set('player-1');
    app.room.set({
      ...roomSnapshot,
      players: [
        roomSnapshot.players[0],
        {
          id: 'player-2',
          nickname: 'Guest',
          score: 0,
          isHost: false,
          connected: false,
        },
      ],
    });

    expect(app.canStart()).toBe(false);

    app.room.set({
      ...roomSnapshot,
      players: [
        roomSnapshot.players[0],
        {
          id: 'player-2',
          nickname: 'Guest',
          score: 0,
          isHost: false,
          connected: true,
        },
      ],
    });

    expect(app.canStart()).toBe(true);
  });

  it('clears the saved session when restoreSession finds an invalidated room', async () => {
    localStorage.setItem(
      'music-game-session',
      JSON.stringify({
        roomCode: 'ROOM1',
        playerId: 'player-1',
        nickname: 'Host',
      }),
    );
    apiMock.getRoom.mockRejectedValue(new Error('Room not found.'));

    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as unknown as {
      notice: () => string;
      room: () => RoomSnapshot | null;
      playerId: () => string | null;
    };

    fixture.detectChanges();
    await fixture.whenStable();

    expect(localStorage.getItem('music-game-session')).toBeNull();
    expect(app.room()).toBeNull();
    expect(app.playerId()).toBeNull();
    expect(app.notice()).toContain('Saved session is no longer valid.');
  });
});
