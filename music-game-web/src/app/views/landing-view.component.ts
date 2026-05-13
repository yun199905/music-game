import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-landing-view',
  imports: [CommonModule, FormsModule],
  templateUrl: './landing-view.component.html',
  standalone: true,
})
export class LandingViewComponent {
  @Input() entryMode: 'create' | 'join' = 'create';
  @Input() nickname = '';
  @Input() joinCode = '';
  @Input() totalRounds = 5;
  @Input() roundDurationSeconds = 30;

  @Output() entryModeChange = new EventEmitter<'create' | 'join'>();
  @Output() fieldChange = new EventEmitter<{
    field: 'nickname' | 'joinCode';
    value: string;
  }>();
  @Output() totalRoundsChange = new EventEmitter<number>();
  @Output() roundDurationSecondsChange = new EventEmitter<number>();
  @Output() createRoom = new EventEmitter<void>();
  @Output() joinRoom = new EventEmitter<void>();
}
