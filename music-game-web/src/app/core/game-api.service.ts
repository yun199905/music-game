import { Injectable } from '@angular/core';
import { appConfigValues } from './app-config';
import {
  CreateSongRequest,
  RoomSessionResponse,
  RoomSnapshot,
  SongCatalogItem,
} from './game.models';

@Injectable({ providedIn: 'root' })
export class GameApiService {
  private readonly baseUrl = appConfigValues.apiBaseUrl;

  async createRoom(payload: {
    nickname: string;
    totalRounds: number;
    roundDurationSeconds: number;
  }): Promise<RoomSessionResponse> {
    return this.post<RoomSessionResponse>('/rooms', payload);
  }

  async joinRoom(roomCode: string, nickname: string): Promise<RoomSessionResponse> {
    return this.post<RoomSessionResponse>(`/rooms/${roomCode}/join`, { nickname });
  }

  async getRoom(roomCode: string): Promise<RoomSnapshot> {
    return this.get<RoomSnapshot>(`/rooms/${roomCode}`);
  }

  async listSongs(): Promise<SongCatalogItem[]> {
    return this.get<SongCatalogItem[]>('/songs');
  }

  async createSong(payload: CreateSongRequest): Promise<SongCatalogItem> {
    return this.post<SongCatalogItem>('/songs', payload);
  }

  private async post<T>(path: string, payload: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(errorBody?.message ?? 'Request failed');
    }

    return (await response.json()) as T;
  }

  private async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`);

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(errorBody?.message ?? 'Request failed');
    }

    return (await response.json()) as T;
  }
}
