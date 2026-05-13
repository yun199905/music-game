import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlayerSnapshot, RoomSnapshot, RoundSnapshot } from '../core/game.models';

@Component({
  selector: 'app-gameplay-view',
  imports: [CommonModule, FormsModule],
  templateUrl: './gameplay-view.component.html',
  standalone: true,
})
export class GameplayViewComponent {
  @Input({ required: true }) room!: RoomSnapshot;
  @Input() canonicalRoomCode = '';
  @Input() currentRound: RoundSnapshot | null = null;
  @Input() lyricLines: string[] = [];
  @Input() lyricDuration = '30s';
  @Input() countdown = 0;
  @Input() hasSubmittedCorrectAnswer = false;
  @Input() isHost = false;
  @Input() canStart = false;
  @Input() winner: PlayerSnapshot | null = null;
  @Input() answer = '';

  @Output() copyRoomCode = new EventEmitter<void>();
  @Output() startGame = new EventEmitter<void>();
  @Output() nextRound = new EventEmitter<void>();
  @Output() leaveRoom = new EventEmitter<void>();
  @Output() submitGuess = new EventEmitter<void>();
  @Output() answerChange = new EventEmitter<string>();
}
