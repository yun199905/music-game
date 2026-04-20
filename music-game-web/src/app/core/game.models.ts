export type RoundPhase = 'idle' | 'guessing' | 'revealed';
export type RoomStatus = 'lobby' | 'in_progress' | 'finished';

export interface PlayerSnapshot {
  id: string;
  nickname: string;
  score: number;
  isHost: boolean;
  connected: boolean;
}

export interface RoundSnapshot {
  id: string;
  roundNumber: number;
  maskedLyrics: string;
  startedAt: string;
  endsAt: string;
  phase: RoundPhase;
  winnerPlayerId?: string;
  revealTitle?: string;
  revealArtist?: string;
}

export interface RoomSnapshot {
  code: string;
  status: RoomStatus;
  phase: RoundPhase;
  hostPlayerId: string;
  totalRounds: number;
  roundDurationSeconds: number;
  currentRoundIndex: number;
  maxPlayers: number;
  players: PlayerSnapshot[];
  currentRound?: RoundSnapshot;
}

export interface RoomSessionResponse {
  playerId: string;
  room: RoomSnapshot;
}
