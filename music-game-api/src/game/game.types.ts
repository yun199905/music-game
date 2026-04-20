export type RoomStatus = 'lobby' | 'in_progress' | 'finished';
export type RoundPhase = 'idle' | 'guessing' | 'revealed';

export type PlayerSession = {
  id: string;
  nickname: string;
  score: number;
  isHost: boolean;
  connected: boolean;
  socketId?: string;
};

export type RoundState = {
  id: string;
  roomCode: string;
  roundNumber: number;
  songId: string;
  songTitle: string;
  songArtist: string;
  acceptedAnswers: string[];
  maskedLyrics: string;
  rawLyrics: string;
  startedAt: string;
  endsAt: string;
  winnerPlayerId?: string;
  guessedPlayerIds: Set<string>;
  phase: RoundPhase;
  timer?: NodeJS.Timeout;
};

export type RoomState = {
  code: string;
  status: RoomStatus;
  phase: RoundPhase;
  hostPlayerId: string;
  maxPlayers: number;
  totalRounds: number;
  roundDurationSeconds: number;
  currentRoundIndex: number;
  players: Map<string, PlayerSession>;
  usedSongIds: Set<string>;
  currentRound?: RoundState;
};

export type PlayerSnapshot = {
  id: string;
  nickname: string;
  score: number;
  isHost: boolean;
  connected: boolean;
};

export type RoomSnapshot = {
  code: string;
  status: RoomStatus;
  phase: RoundPhase;
  hostPlayerId: string;
  totalRounds: number;
  roundDurationSeconds: number;
  currentRoundIndex: number;
  maxPlayers: number;
  players: PlayerSnapshot[];
  currentRound?: {
    id: string;
    roundNumber: number;
    maskedLyrics: string;
    startedAt: string;
    endsAt: string;
    phase: RoundPhase;
    winnerPlayerId?: string;
    revealTitle?: string;
    revealArtist?: string;
  };
};
