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
    disconnect: ReturnType<typeof vi.fn>;
    onRoomState: ReturnType<typeof vi.fn>;
    onRoundStarted: ReturnType<typeof vi.fn>;
    onRoundEnded: ReturnType<typeof vi.fn>;
    onGameEnded: ReturnType<typeof vi.fn>;
    onDisconnect: ReturnType<typeof vi.fn>;
    onReconnect: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
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
      disconnect: vi.fn(),
      onRoomState: vi.fn(),
      onRoundStarted: vi.fn(),
      onRoundEnded: vi.fn(),
      onGameEnded: vi.fn(),
      onDisconnect: vi.fn(),
      onReconnect: vi.fn(),
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
});
