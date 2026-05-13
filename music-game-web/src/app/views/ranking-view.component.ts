import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PlayerSnapshot, RoomSnapshot } from '../core/game.models';

@Component({
  selector: 'app-ranking-view',
  imports: [CommonModule],
  templateUrl: './ranking-view.component.html',
  standalone: true,
})
export class RankingViewComponent {
  @Input() room: RoomSnapshot | null = null;
  @Input() currentPlayer: PlayerSnapshot | null = null;
}
