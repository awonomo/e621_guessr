// Shared types between frontend and backend
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

export interface E621Post {
  id: number;
  created_at: string;
  updated_at: string;
  file: {
    width: number;
    height: number;
    ext: string;
    size: number;
    md5: string;
    url: string;
  };
  preview: {
    width: number;
    height: number;
    url: string;
  };
  sample: {
    has: boolean;
    height: number;
    width: number;
    url: string;
    alternates?: Record<string, unknown>;
  };
  score: {
    up: number;
    down: number;
    total: number;
  };
  tags: Record<TagCategory, string[]>;
  locked_tags: string[];
  change_seq: number;
  flags: {
    pending: boolean;
    flagged: boolean;
    note_locked: boolean;
    status_locked: boolean;
    rating_locked: boolean;
    deleted: boolean;
  };
  rating: Rating;
  fav_count: number;
  sources: string[];
  pools: number[];
  relationships: {
    parent_id: number | null;
    has_children: boolean;
    has_active_children: boolean;
    children: number[];
  };
  approver_id: number | null;
  uploader_id: number;
  description: string;
  comment_count: number;
  is_favorited: boolean;
  has_notes: boolean;
  duration: number | null;
}

export interface PostsQuery {
  tags?: string;
  limit?: number;
  page?: number;
  minScore?: number;
  minTagCount?: number;
  ratings?: Rating[];
  customCriteria?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PostsApiResponse {
  posts: E621Post[];
  total?: number;
  page?: number;
  hasMore?: boolean;
}

export interface DailyChallengeData {
  id: string;
  date: string; // YYYY-MM-DD
  posts: E621Post[];
  settings: {
    timeLimit: number;
    totalRounds: number;
    ratings: Rating[];
    minUpvotes: number;
    minTagCount: number;
    customCriteria: string;
  };
  participants?: number;
  topScore?: number;
}

export interface GameSessionSubmission {
  sessionId: string;
  totalScore: number;
  rounds: Array<{
    postId: number;
    score: number;
    correctGuesses: number;
    totalGuesses: number;
    timeUsed: number;
  }>;
  completedAt: string;
}