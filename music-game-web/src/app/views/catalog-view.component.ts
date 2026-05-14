import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SongCatalogItem } from '../core/game.models';

@Component({
  selector: 'app-catalog-view',
  imports: [CommonModule, FormsModule],
  templateUrl: './catalog-view.component.html',
  standalone: true,
})
export class CatalogViewComponent {
  @Input() inRoom = false;
  @Input() catalogOpen = true;
  @Input() catalogLoading = false;
  @Input() catalogSaving = false;
  @Input() catalogMessage = '';
  @Input() catalogError = '';
  @Input() catalogSongs: SongCatalogItem[] = [];
  @Input() enabledSongCount = 0;
  @Input() editingSongId: string | null = null;
  @Input() songTitle = '';
  @Input() songArtist = '';
  @Input() songLanguage: 'zh-TW' | 'zh-CN' | 'en' = 'en';
  @Input() songAliases = '';
  @Input() songLocalLyrics = '';

  @Output() toggleCatalog = new EventEmitter<void>();
  @Output() songFieldChange = new EventEmitter<{
    field: 'title' | 'artist' | 'language' | 'aliases' | 'localLyrics';
    value: string;
  }>();
  @Output() submitSong = new EventEmitter<void>();
  @Output() editSong = new EventEmitter<string>();
  @Output() cancelEdit = new EventEmitter<void>();
  @Output() toggleSongEnabled = new EventEmitter<{ songId: string; enabled: boolean }>();
}
