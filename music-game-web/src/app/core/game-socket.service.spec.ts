import { vi } from 'vitest';
import { GameSocketService } from './game-socket.service';
import { RoomSnapshot } from './game.models';

type Handler = (...args: unknown[]) => void;

class FakeManager {
  private handlers = new Map<string, Set<Handler>>();

  on(event: string, handler: Handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }

    this.handlers.get(event)?.add(handler);
  }

  emit(event: string, ...args: unknown[]) {
    for (const handler of this.handlers.get(event) ?? []) {
      handler(...args);
    }
  }
}

class FakeSocket {
  connected = false;
  io = new FakeManager();
  private handlers = new Map<string, Set<Handler>>();
  private ackImpl: (event: string, payload: unknown) => Promise<unknown> = async () => undefined;

  on(event: string, handler: Handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }

    this.handlers.get(event)?.add(handler);
  }

  off(event: string, handler: Handler) {
    this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, ...args: unknown[]) {
    for (const handler of this.handlers.get(event) ?? []) {
      handler(...args);
    }
  }

  connect() {
    this.connected = true;
    this.emit('connect');
  }

  failConnect(error: unknown) {
    this.connected = false;
    this.emit('connect_error', error);
  }

  disconnect() {
    this.connected = false;
  }

  timeout() {
    return {
      emitWithAck: (event: string, payload: unknown) => this.ackImpl(event, payload),
    };
  }

  setAckImpl(ackImpl: (event: string, payload: unknown) => Promise<unknown>) {
    this.ackImpl = ackImpl;
  }
}

const fakeSocket = new FakeSocket();

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => fakeSocket),
}));

describe('GameSocketService', () => {
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

  beforeEach(() => {
    (
      fakeSocket as unknown as {
        connected: boolean;
        io: FakeManager;
        handlers: Map<string, Set<Handler>>;
      }
    ).connected = false;
    (
      fakeSocket as unknown as {
        connected: boolean;
        io: FakeManager;
        handlers: Map<string, Set<Handler>>;
      }
    ).io = new FakeManager();
    (
      fakeSocket as unknown as {
        connected: boolean;
        io: FakeManager;
        handlers: Map<string, Set<Handler>>;
      }
    ).handlers = new Map();
    fakeSocket.setAckImpl(async () => roomSnapshot);
  });

  it('clears the active session when disconnect is called', () => {
    const service = new GameSocketService();

    (
      service as unknown as {
        activeSession?: { roomCode: string; playerId: string };
        reconnecting: boolean;
        socket?: { disconnect: () => void };
      }
    ).activeSession = {
      roomCode: 'ROOM1',
      playerId: 'player-1',
    };
    (
      service as unknown as {
        activeSession?: { roomCode: string; playerId: string };
        reconnecting: boolean;
        socket?: { disconnect: () => void };
      }
    ).reconnecting = true;

    let disconnectCalled = false;
    (
      service as unknown as {
        activeSession?: { roomCode: string; playerId: string };
        reconnecting: boolean;
        socket?: { disconnect: () => void };
      }
    ).socket = {
      disconnect: () => {
        disconnectCalled = true;
      },
    };

    service.disconnect();

    expect(disconnectCalled).toBe(true);
    expect(
      (
        service as unknown as {
          activeSession?: { roomCode: string; playerId: string };
          reconnecting: boolean;
          socket?: { disconnect: () => void };
        }
      ).activeSession,
    ).toBeUndefined();
    expect(
      (
        service as unknown as {
          activeSession?: { roomCode: string; playerId: string };
          reconnecting: boolean;
          socket?: { disconnect: () => void };
        }
    ).reconnecting,
    ).toBe(false);
  });

  it('connects successfully and stores the active session', async () => {
    const service = new GameSocketService();

    const room = await service.connect('ROOM1', 'player-1');

    expect(room).toEqual(roomSnapshot);
    expect(
      (
        service as unknown as {
          activeSession?: { roomCode: string; playerId: string };
        }
      ).activeSession,
    ).toEqual({
      roomCode: 'ROOM1',
      playerId: 'player-1',
    });
  });

  it('surfaces connect errors through normalizeError', async () => {
    const service = new GameSocketService();
    vi.spyOn(fakeSocket, 'connect').mockImplementationOnce(() => {
      fakeSocket.failConnect({ message: ['Nickname is required.', 'Room code is required.'] });
    });

    await expect(service.connect('ROOM1', 'player-1')).rejects.toThrow(
      'Nickname is required., Room code is required.',
    );
  });

  it('wires the manager reconnect event to the rejoin flow', () => {
    const service = new GameSocketService();
    const rejoinSpy = vi
      .spyOn(
        service as unknown as {
          rejoinActiveSession: () => Promise<void>;
        },
        'rejoinActiveSession',
      )
      .mockResolvedValue(undefined);

    (
      service as unknown as {
        createSocket: () => void;
      }
    ).createSocket();

    fakeSocket.io.emit('reconnect');

    expect(rejoinSpy).toHaveBeenCalledTimes(1);
  });

  it('rejoins the active room successfully after reconnect', async () => {
    const service = new GameSocketService();
    const reconnectListener = vi.fn();
    service.onReconnect(reconnectListener);

    await service.connect('ROOM1', 'player-1');

    fakeSocket.setAckImpl(async (event) => {
      if (event === 'join_room') {
        return roomSnapshot;
      }

      throw new Error('unexpected event');
    });

    await (
      service as unknown as {
        rejoinActiveSession: () => Promise<void>;
      }
    ).rejoinActiveSession();

    expect(reconnectListener).toHaveBeenCalledWith(roomSnapshot);
  });

  it('surfaces rejoin ack failures through the disconnect listener', async () => {
    const service = new GameSocketService();
    const disconnectListener = vi.fn();
    service.onDisconnect(disconnectListener);

    await service.connect('ROOM1', 'player-1');

    fakeSocket.setAckImpl(async () => {
      throw new Error('operation has timed out');
    });

    await (
      service as unknown as {
        rejoinActiveSession: () => Promise<void>;
      }
    ).rejoinActiveSession();

    expect(disconnectListener).toHaveBeenCalledWith('operation has timed out');
  });

  it('normalizes ack errors that expose a string message', async () => {
    const service = new GameSocketService();
    fakeSocket.setAckImpl(async () => {
      throw { message: 'Request failed on server' };
    });

    await expect(service.emitGuess('ROOM1', 'player-1', 'guess')).rejects.toThrow(
      'Request failed on server',
    );
  });

  it('falls back to a generic message for unknown ack errors', async () => {
    const service = new GameSocketService();
    fakeSocket.setAckImpl(async () => {
      throw { unexpected: true };
    });

    await expect(service.emitGuess('ROOM1', 'player-1', 'guess')).rejects.toThrow(
      'Socket request failed',
    );
  });

  it('surfaces reconnect_failed with a clear message', () => {
    const service = new GameSocketService();
    const disconnectListener = vi.fn();
    service.onDisconnect(disconnectListener);

    (
      service as unknown as {
        createSocket: () => void;
      }
    ).createSocket();

    fakeSocket.io.emit('reconnect_failed');

    expect(disconnectListener).toHaveBeenCalledWith('Unable to reconnect to the room.');
  });

  it('surfaces reconnect_error through the disconnect listener', () => {
    const service = new GameSocketService();
    const disconnectListener = vi.fn();
    service.onDisconnect(disconnectListener);

    (
      service as unknown as {
        createSocket: () => void;
      }
    ).createSocket();

    fakeSocket.io.emit('reconnect_error', new Error('transport failed'));

    expect(disconnectListener).toHaveBeenCalledWith('transport failed');
  });
});
