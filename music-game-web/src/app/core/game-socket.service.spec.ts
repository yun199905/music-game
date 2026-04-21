import { GameSocketService } from './game-socket.service';

describe('GameSocketService', () => {
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
});
