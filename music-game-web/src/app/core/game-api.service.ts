import { Injectable, inject } from '@angular/core';
import { appConfigValues } from './app-config';
import { RoomSessionResponse } from './game.models';

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
}
