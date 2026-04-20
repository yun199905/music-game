import { Injectable, inject } from '@angular/core';
import { appConfigValues } from './app-config';
import { RoomSessionResponse, RoomSnapshot } from './game.models';

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
