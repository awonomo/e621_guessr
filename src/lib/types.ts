// Core game types and interfaces

export type GameState =
  | 'home'
  | 'setup'
  | 'countdown'
  | 'playing'
  | 'roundSummary'
  | 'gameSummary';

export type GameMode =
  | 'classic'
  | 'daily'
  | 'timeAttack'
  | 'endless';

export type Rating = 'safe' | 'questionable' | 'explicit';

export type TagCategory =
  | 'general'
  | 'artist'
  | 'copyright'
  | 'character'
  | 'species'
  | 'meta'
  | 'lore'
  | 'invalid';

export interface GameSettings {
  mode: GameMode;
  timeLimit: number; // seconds per round
  totalRounds: number;
  ratings: Rating[];
  minUpvotes: number;
  customCriteria: string;
}

export interface Post {
  id: number;
  file: {
    url: string;
    width: number;
    height: number;
  };
  sample: {
    url: string;
    width: number;
    height: number;
  };
  preview: {
    url: string;
    width: number;
    height: number;
  };
  tags: Record<TagCategory, string[]>;
  score: {
    up: number;
    down: number;
    total: number;
  };
  rating: Rating;
  created_at: string;
}

export interface RoundData {
  post: Post;
  timeLimit: number;
  timeRemaining: number;
  correctGuesses: Partial<Record<TagCategory, TagScoreEntry[]>>;
  totalGuesses: number;
  incorrectGuesses: number; // Track incorrect guesses for rate limiting
  incorrectGuessTimestamps: number[]; // Timestamps for rate limiting
  score: number;
  startedAt: Date;
  endedAt?: Date;
  pauseCount: number; // Track how many times player has paused this round
}

export interface GameSession {
  id: string;
  settings: GameSettings;
  rounds: RoundData[];
  currentRound: number;
  totalScore: number;
  startedAt: Date;
  endedAt?: Date;
  isActive: boolean;
}

export interface DailyChallenge {
  date: string; // YYYY-MM-DD
  posts: Post[];
  settings: Omit<GameSettings, 'mode'>;
  leaderboard?: Array<{
    playerId: string;
    score: number;
    completedAt: Date;
  }>;
}

export interface GuessResult {
  guess: string;
  actualTag?: string; // What the tag actually resolved to (for aliases)
  score: number; // Points earned (0 if incorrect)
  isCorrect: boolean;
  category?: TagCategory;
  wasFromAlias?: boolean; // True if guess was matched via alias
  rateLimited?: boolean; // True if guess was blocked due to rate limiting
  blockedByCustomCriteria?: boolean; // True if guess was blocked by custom criteria
}

export interface TagScoreEntry {
  tag: string;
  actualTag?: string;
  score: number;
  category: TagCategory;
  wasFromAlias?: boolean;
  timestamp: number;
}

export interface BestTag {
  tag: string;
  category: TagCategory;
  score: number;
}

export interface GameStats {
  gamesPlayed: number;
  totalScore: number;
  averageScore: number;
  bestScore: number;
  totalTagsGuessed: number;
  accuracyRate: number;
  favoriteCategories: TagCategory[];
  dailyChallengesCompleted: number;
  bestTag: BestTag | null;
}

export interface AppState {
  currentState: GameState;
  currentSession: GameSession | null;
  dailyChallenge: DailyChallenge | null;
  userStats: GameStats;
  isPaused: boolean;
  settings: {
    soundEnabled: boolean;
    theme: 'light' | 'dark' | 'auto';
    animations: boolean;
    autoAdvanceRounds: boolean;
  };
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PostsApiResponse {
  posts: Post[];
}

export interface DailyChallengeApiResponse {
  challenge: DailyChallenge;
}