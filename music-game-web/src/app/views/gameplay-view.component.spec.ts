import { TestBed } from '@angular/core/testing';
import { GameplayViewComponent } from './gameplay-view.component';
import { RoomSnapshot } from '../core/game.models';

describe('GameplayViewComponent', () => {
  const room: RoomSnapshot = {
    code: 'ROOM1',
    status: 'lobby',
    phase: 'idle',
    hostPlayerId: 'player-1',
    totalRounds: 2,
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
      {
        id: 'player-2',
        nickname: 'Guest',
        score: 0,
        isHost: false,
        connected: true,
      },
    ],
  };

  it('emits startGame when the start button is clicked', async () => {
    const fixture = await TestBed.configureTestingModule({
      imports: [GameplayViewComponent],
    }).createComponent(GameplayViewComponent);

    fixture.componentRef.setInput('room', room);
    fixture.componentRef.setInput('canonicalRoomCode', room.code);
    fixture.componentRef.setInput('canStart', true);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance;
    const spy = vi.fn();
    component.startGame.subscribe(spy);

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    const startButton = buttons.find((element) => element.textContent?.includes('Start Game'))!;

    startButton.click();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
