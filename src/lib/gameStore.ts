// Simple state management without Svelte 5 runes for now
import { writable, derived, get } from 'svelte/store';
import { 
  type GameState, 
  type GameSession, 
  type GameSettings, 
  type DailyChallenge, 
  type AppState, 
  type RoundData, 
  type GuessResult,
  type Post,
  type GameStats,
  type TagCategory,
  type TagScoreEntry
} from './types.js';
import backendApi from './backendApi.js';

// Create writable stores
const appState = writable<AppState>({
  currentState: 'home',
  currentSession: null,
  dailyChallenge: null,
  isPaused: false,
  userStats: {
    gamesPlayed: 0,
    totalScore: 0,
    averageScore: 0,
    bestScore: 0,
    totalTagsGuessed: 0,
    accuracyRate: 0,
    favoriteCategories: [],
    dailyChallengesCompleted: 0
  },
  settings: {
    soundEnabled: true,
    theme: 'dark',
    animations: true,
    autoAdvanceRounds: false
  }
});

// Add debug logging for all state changes
appState.subscribe(state => {
  console.log('[GameStore] State changed to:', state.currentState);
  if (state.currentSession) {
    const session = state.currentSession;
    console.log('[GameStore] Session active:', {
      id: session.id.slice(0, 8) + '...',
      round: session.currentRound + 1,
      totalRounds: session.rounds.length,
      totalScore: session.totalScore,
      isActive: session.isActive
    });
  } else {
    console.log('[GameStore] No active session');
  }
});

// Derived stores for easy access
export const currentState = derived(appState, $state => $state.currentState);
export const currentSession = derived(appState, $state => $state.currentSession);
export const dailyChallenge = derived(appState, $state => $state.dailyChallenge);
export const userStats = derived(appState, $state => $state.userStats);
export const settings = derived(appState, $state => $state.settings);
export const isPaused = derived(appState, $state => $state.isPaused);

export const currentRound = derived(appState, $state => {
  if (!$state.currentSession || $state.currentSession.rounds.length === 0) return null;
  return $state.currentSession.rounds[$state.currentSession.currentRound] || null;
});

export const isGameActive = derived(appState, $state => $state.currentSession?.isActive === true);

export const canAdvanceRound = derived(appState, $state => {
  if (!$state.currentSession) return false;
  return $state.currentSession.currentRound < $state.currentSession.rounds.length - 1;
});

export const isLastRound = derived(appState, $state => {
  if (!$state.currentSession) return false;
  return $state.currentSession.currentRound === $state.currentSession.rounds.length - 1;
});

// Action functions
export const gameActions = {
  navigateToHome() {
    console.log('[GameStore] Navigating to home screen');
    appState.update(state => {
      console.log('[GameStore] State updated to home, previous:', state.currentState);
      return {
        ...state,
        currentState: 'home'
      };
    });
  },

  navigateToSetup() {
    console.log('[GameStore] Navigating to setup screen');
    appState.update(state => {
      console.log('[GameStore] State updated to setup, previous:', state.currentState);
      return {
        ...state,
        currentState: 'setup'
      };
    });
  },

  startGame(settings: GameSettings, posts: Post[]) {
    console.log('[GameStore] Starting new game with settings:', settings);
    console.log('[GameStore] Posts loaded:', posts.length);
    
    const sessionId = crypto.randomUUID();
    const now = new Date();
    
    const rounds: RoundData[] = posts.slice(0, settings.totalRounds).map(post => ({
      post,
      timeLimit: settings.timeLimit,
      timeRemaining: settings.timeLimit,
      correctGuesses: {},
      totalGuesses: 0,
      incorrectGuesses: 0,
      incorrectGuessTimestamps: [],
      score: 0,
      startedAt: now
    }));

    console.log('[GameStore] Created', rounds.length, 'rounds');
    console.log('[GameStore] Session ID:', sessionId);

    appState.update(state => {
      console.log('[GameStore] Transitioning from', state.currentState, 'to countdown');
      return {
        ...state,
        currentSession: {
          id: sessionId,
          settings,
          rounds,
          currentRound: 0,
          totalScore: 0,
          startedAt: now,
          isActive: true
        },
        currentState: 'countdown'
      };
    });
    
    // Start preloading first round image immediately
    setTimeout(() => {
      console.log('[GameStore] Starting image preload after delay');
      this.preloadCurrentRoundImage();
    }, 100);
  },

  async startRound() {
    console.log('[GameStore] Starting round - preloading image');
    
    try {
      // Preload current round image before transitioning to playing state
      await this.preloadCurrentRoundImage();
      console.log('[GameStore] Image preload completed');
    } catch (error) {
      console.error('[GameStore] Image preload failed:', error);
    }
    
    appState.update(state => {
      if (!state.currentSession) {
        console.error('[GameStore] Cannot start round - no active session');
        return state;
      }
      
      const roundIndex = state.currentSession.currentRound;
      const currentRoundData = state.currentSession.rounds[roundIndex];
      
      if (!currentRoundData) {
        console.error('[GameStore] Cannot start round - no round data for index:', roundIndex);
        return state;
      }
      
      console.log('[GameStore] Starting round', roundIndex + 1, 'of', state.currentSession.rounds.length);
      console.log('[GameStore] Round post ID:', currentRoundData.post.id);
      
      currentRoundData.startedAt = new Date();
      currentRoundData.timeRemaining = currentRoundData.timeLimit;
      
      console.log('[GameStore] Transitioning from', state.currentState, 'to playing');
      
      return {
        ...state,
        currentState: 'playing',
        isPaused: false // Ensure game is not paused when starting a round
      };
    });
  },

  async submitGuess(guess: string): Promise<GuessResult> {
    console.log('[GameStore] Submitting guess:', guess);
    
    const state = get(appState);
    const session = state.currentSession;
    
    if (!session || !session.isActive) {
      console.warn('[GameStore] Cannot submit guess - no active session');
      return { guess, score: 0, isCorrect: false };
    }
    
    const round = session.rounds[session.currentRound];
    if (!round) {
      console.error('[GameStore] Cannot submit guess - no current round');
      return { guess, score: 0, isCorrect: false };
    }

    const normalizedGuess = guess.toLowerCase().trim();
    console.log('[GameStore] Normalized guess:', normalizedGuess);
    
    // Rate limiting check
    const now = Date.now();
    const tenSecondsAgo = now - 10000;
    const recentIncorrectGuesses = round.incorrectGuessTimestamps.filter(timestamp => timestamp > tenSecondsAgo);
    
    if (recentIncorrectGuesses.length >= 5) {
      console.warn('[GameStore] Rate limited - too many incorrect guesses');
      return { 
        guess, 
        score: 0, 
        isCorrect: false, 
        rateLimited: true 
      };
    }

    // Step 1: Check if guess matches any tag on the post
    console.log('[GameStore] Step 1: Checking for direct tag match');
    let matchedTag: string | null = null;
    let matchedCategory: TagCategory | undefined;
    
    for (const [cat, tags] of Object.entries(round.post.tags)) {
      const tagCategory = cat as TagCategory;
      
      if (tags.some(tag => tag.toLowerCase() === normalizedGuess)) {
        matchedTag = tags.find(tag => tag.toLowerCase() === normalizedGuess) || null;
        matchedCategory = tagCategory;
        console.log('[GameStore] Direct match found:', matchedTag, 'in category:', tagCategory);
        break;
      }
    }

    if (!matchedTag) {
      // Step 2: No direct match - check if guess is an alias that resolves to a post tag
      console.log('[GameStore] Step 2: No direct match, checking backend for alias');
      try {
        const backendResult = await backendApi.scoreTag(normalizedGuess);
        console.log('[GameStore] Backend result:', backendResult);
        
        if (backendResult && backendResult.isCorrect && backendResult.actualTag) {
          console.log('[GameStore] Backend found tag:', backendResult.actualTag);
          
          // Check if the resolved tag is on this post
          for (const [cat, tags] of Object.entries(round.post.tags)) {
            const tagCategory = cat as TagCategory;
            
            if (tags.some(tag => tag.toLowerCase() === backendResult.actualTag!.toLowerCase())) {
              matchedTag = backendResult.actualTag;
              matchedCategory = tagCategory;
              
              console.log('[GameStore] Alias resolved to post tag:', matchedTag, 'with 10% deduction');
              
              // Mark this as an alias match with slight point deduction
              const aliasResult = await this.processCorrectGuess(
                guess, 
                matchedTag, 
                matchedCategory, 
                backendResult.score * 0.9, // 10% deduction for alias
                true // wasFromAlias
              );
              
              return aliasResult;
            }
          }
          console.log('[GameStore] Backend tag not found on current post');
        }
      } catch (error) {
        console.warn('[GameStore] Backend alias check failed:', error);
      }
      
      // Step 3: No match found - record as incorrect
      console.log('[GameStore] Step 3: No match found, processing as incorrect');
      return this.processIncorrectGuess(guess);
    }

    // Check if already guessed (check both original guess and resolved tag)
    const alreadyGuessed = round.correctGuesses[matchedCategory!]?.some(
      entry => {
        const entryTagLower = entry.tag.toLowerCase();
        const entryActualTagLower = entry.actualTag?.toLowerCase();
        const matchedTagLower = matchedTag!.toLowerCase();
        
        // Check if we've already guessed this exact tag OR if we've guessed something that resolves to this tag
        return entryTagLower === matchedTagLower || 
               entryActualTagLower === matchedTagLower ||
               (entry.actualTag && entryActualTagLower === matchedTagLower);
      }
    );
    
    if (alreadyGuessed) {
      console.log('[GameStore] Tag already guessed:', matchedTag);
      return { 
        guess, 
        score: 0, 
        isCorrect: false 
      };
    }

    // Step 4: Valid new guess - get score from backend
    console.log('[GameStore] Step 4: Getting score for valid tag:', matchedTag);
    try {
      const backendResult = await backendApi.scoreTag(matchedTag);
      const score = backendResult?.score || this.fallbackScore(matchedTag, matchedCategory!);
      
      console.log('[GameStore] Final score:', score, '(backend:', backendResult?.score, ')');
      return this.processCorrectGuess(guess, matchedTag, matchedCategory!, score, false);
    } catch (error) {
      console.warn('Backend scoring failed, using fallback:', error);
      const fallbackScore = this.fallbackScore(matchedTag, matchedCategory!);
      return this.processCorrectGuess(guess, matchedTag, matchedCategory!, fallbackScore, false);
    }
  },

  processCorrectGuess(
    guess: string, 
    actualTag: string, 
    category: TagCategory, 
    score: number, 
    wasFromAlias: boolean
  ): GuessResult {
    appState.update(state => {
      const session = state.currentSession;
      if (!session || !session.isActive) return state;
      
      const round = session.rounds[session.currentRound];
      if (!round) return state;

      round.totalGuesses++;
      
      const tagEntry: TagScoreEntry = {
        tag: guess, // Use the original guess, not the resolved tag
        actualTag: wasFromAlias ? actualTag : undefined,
        score: Math.round(score),
        category,
        wasFromAlias
      };

      // Add to correct guesses
      if (!round.correctGuesses[category]) {
        round.correctGuesses[category] = [];
      }
      round.correctGuesses[category]!.push(tagEntry);
      
      // Update scores
      round.score += tagEntry.score;
      session.totalScore += tagEntry.score;
      
      // Update stats
      state.userStats.totalTagsGuessed++;
      
      return state;
    });

    return {
      guess,
      actualTag: wasFromAlias ? actualTag : undefined,
      score: Math.round(score),
      isCorrect: true,
      category,
      wasFromAlias
    };
  },

  processIncorrectGuess(guess: string): GuessResult {
    appState.update(state => {
      const session = state.currentSession;
      if (!session || !session.isActive) return state;
      
      const round = session.rounds[session.currentRound];
      if (!round) return state;

      round.totalGuesses++;
      round.incorrectGuesses++;
      round.incorrectGuessTimestamps.push(Date.now());
      
      // Clean up old timestamps (keep only last 10 seconds)
      const tenSecondsAgo = Date.now() - 10000;
      round.incorrectGuessTimestamps = round.incorrectGuessTimestamps.filter(
        timestamp => timestamp > tenSecondsAgo
      );
      
      return state;
    });

    return {
      guess,
      score: 0,
      isCorrect: false
    };
  },

  fallbackScore(tag: string, category: TagCategory): number {
    // Fallback scoring if backend is unavailable - matches new backend range
    const categoryBasePoints = {
      general: 1200, // 120 * 10 to match backend scaling
      artist: 600,   // Artists get lower base (0.6 weight)
      copyright: 900,
      character: 1000,
      species: 1100,
      meta: 700,
      lore: 1500,    // Lore gets highest (1.5 weight)  
      invalid: 300
    };

    // Generate deterministic "rarity" bonus based on tag name
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = ((hash << 5) - hash + tag.charCodeAt(i)) & 0xffffffff;
    }
    
    // Create more interesting distribution similar to backend
    const normalizedHash = (Math.abs(hash) % 10000) / 10000; // 0-1
    const rarityMultiplier = 0.1 + (normalizedHash * 0.9); // 0.1-1.0 range
    
    const baseScore = categoryBasePoints[category] * rarityMultiplier;
    
    // Ensure minimum 100 points
    return Math.max(100, Math.round(baseScore));
  },

  endRound() {
    console.log('[GameStore] Ending current round');
    
    appState.update(state => {
      if (!state.currentSession) {
        console.error('[GameStore] Cannot end round - no active session');
        return state;
      }
      
      const roundIndex = state.currentSession.currentRound;
      const round = state.currentSession.rounds[roundIndex];
      
      if (round) {
        round.endedAt = new Date();
        round.timeRemaining = 0;
        
        console.log('[GameStore] Round', roundIndex + 1, 'ended');
        console.log('[GameStore] Round score:', round.score);
        console.log('[GameStore] Correct guesses:', Object.values(round.correctGuesses).flat().length);
        console.log('[GameStore] Total guesses:', round.totalGuesses);
      }
      
      console.log('[GameStore] Transitioning from', state.currentState, 'to roundSummary');
      
      return {
        ...state,
        currentState: 'roundSummary'
      };
    });
  },

  nextRound() {
    console.log('[GameStore] Advancing to next round');
    
    appState.update(state => {
      if (!state.currentSession) {
        console.error('[GameStore] Cannot advance round - no active session');
        return state;
      }
      
      const currentRoundIndex = state.currentSession.currentRound;
      const totalRounds = state.currentSession.rounds.length;
      const canAdvance = currentRoundIndex < totalRounds - 1;
      
      console.log('[GameStore] Current round:', currentRoundIndex + 1, 'of', totalRounds);
      console.log('[GameStore] Can advance:', canAdvance);
      
      if (canAdvance) {
        const nextRoundIndex = currentRoundIndex + 1;
        console.log('[GameStore] Advancing to round', nextRoundIndex + 1);
        
        // Start preloading the next round's image in background
        setTimeout(() => {
          console.log('[GameStore] Starting next round image preload');
          this.preloadNextRoundImage();
        }, 1000);
        
        console.log('[GameStore] Transitioning from', state.currentState, 'to countdown');
        
        return {
          ...state,
          currentSession: {
            ...state.currentSession,
            currentRound: nextRoundIndex
          },
          currentState: 'countdown'
        };
      } else {
        // End game
        console.log('[GameStore] Game complete - ending session');
        
        const session = state.currentSession;
        session.endedAt = new Date();
        session.isActive = false;
        
        console.log('[GameStore] Final total score:', session.totalScore);
        console.log('[GameStore] Session duration:', 
          session.endedAt.getTime() - session.startedAt.getTime(), 'ms');
        
        // Update stats
        updateUserStats(state, session);
        
        console.log('[GameStore] Transitioning from', state.currentState, 'to gameSummary');
        
        return {
          ...state,
          currentState: 'gameSummary'
        };
      }
    });
  },

  togglePause() {
    console.log('[GameStore] Toggling pause state');
    
    appState.update(state => {
      if (state.currentState !== 'playing') {
        console.warn('[GameStore] Cannot pause - not in playing state');
        return state;
      }
      
      const newPauseState = !state.isPaused;
      console.log('[GameStore] Pause state changed to:', newPauseState);
      
      return {
        ...state,
        isPaused: newPauseState
      };
    });
  },

  resetGame() {
    console.log('[GameStore] Resetting game - returning to home');
    
    appState.update(state => {
      if (state.currentSession) {
        console.log('[GameStore] Ending active session:', state.currentSession.id);
      }
      
      console.log('[GameStore] Transitioning from', state.currentState, 'to home');
      
      return {
        ...state,
        currentSession: null,
        currentState: 'home',
        isPaused: false // Reset pause state
      };
    });
  },

  updateTimeRemaining(timeRemaining: number) {
    appState.update(state => {
      if (!state.currentSession) return state;
      
      const round = state.currentSession.rounds[state.currentSession.currentRound];
      if (!round) return state;

      round.timeRemaining = timeRemaining;
      
      if (timeRemaining <= 0) {
        console.log('[GameStore] Timer expired - ending round');
        round.endedAt = new Date();
        
        console.log('[GameStore] Transitioning from', state.currentState, 'to roundSummary (timer)');
        
        return {
          ...state,
          currentState: 'roundSummary'
        };
      }
      
      return state;
    });
  },

  updateSettings(newSettings: Partial<AppState['settings']>) {
    appState.update(state => ({
      ...state,
      settings: {
        ...state.settings,
        ...newSettings
      }
    }));
    saveSettingsToStorage();
  },

  setDailyChallenge(challenge: DailyChallenge) {
    appState.update(state => ({
      ...state,
      dailyChallenge: challenge
    }));
  },

  startDailyChallenge() {
    appState.update(state => {
      if (!state.dailyChallenge) return state;
      
      const gameSettings: GameSettings = {
        ...state.dailyChallenge.settings,
        mode: 'daily'
      };
      
      // Start game with daily challenge posts
      const sessionId = crypto.randomUUID();
      const now = new Date();
      
      const rounds: RoundData[] = state.dailyChallenge.posts.slice(0, gameSettings.totalRounds).map(post => ({
        post,
        timeLimit: gameSettings.timeLimit,
        timeRemaining: gameSettings.timeLimit,
        correctGuesses: {},
        totalGuesses: 0,
        incorrectGuesses: 0,
        incorrectGuessTimestamps: [],
        score: 0,
        startedAt: now
      }));

      return {
        ...state,
        currentSession: {
          id: `daily-${sessionId}`,
          settings: gameSettings,
          rounds,
          currentRound: 0,
          totalScore: 0,
          startedAt: now,
          isActive: true
        },
        currentState: 'countdown'
      };
    });
  },

  restartWithSameSettings() {
    appState.update(state => {
      if (!state.currentSession) return state;
      
      // For now, just navigate back to setup
      // In a full implementation, this would:
      // 1. Store the previous settings temporarily
      // 2. Fetch new posts with same criteria 
      // 3. Start a new game automatically
      
      return {
        ...state,
        currentSession: null,
        currentState: 'setup'
      };
    });
  },

  async preloadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject();
      img.src = url;
    });
  },

  async preloadCurrentRoundImage(): Promise<void> {
    const state = get(appState);
    if (!state.currentSession) {
      console.warn('[GameStore] Cannot preload image - no active session');
      return;
    }
    
    const roundIndex = state.currentSession.currentRound;
    const currentRound = state.currentSession.rounds[roundIndex];
    
    if (!currentRound) {
      console.warn('[GameStore] Cannot preload image - no current round');
      return;
    }
    
    const imageUrl = currentRound.post.sample?.url || currentRound.post.file?.url;
    console.log('[GameStore] Preloading current round image:', imageUrl);
    
    if (imageUrl) {
      try {
        await this.preloadImage(imageUrl);
        console.log('[GameStore] Current round image preloaded successfully');
      } catch (error) {
        console.error('[GameStore] Failed to preload current round image:', error);
      }
    } else {
      console.warn('[GameStore] No image URL found for current round');
    }
  },

  async preloadNextRoundImage(): Promise<void> {
    const state = get(appState);
    if (!state.currentSession) {
      console.warn('[GameStore] Cannot preload next image - no active session');
      return;
    }
    
    const nextRoundIndex = state.currentSession.currentRound + 1;
    const nextRound = state.currentSession.rounds[nextRoundIndex];
    
    if (nextRound) {
      const imageUrl = nextRound.post.sample?.url || nextRound.post.file?.url;
      console.log('[GameStore] Preloading next round image:', imageUrl);
      
      if (imageUrl) {
        try {
          await this.preloadImage(imageUrl);
          console.log('[GameStore] Next round image preloaded successfully');
        } catch (error) {
          console.error('[GameStore] Failed to preload next round image:', error);
        }
      } else {
        console.warn('[GameStore] No image URL found for next round');
      }
    } else {
      console.log('[GameStore] No next round to preload');
    }
  }
};

// Helper functions
function updateUserStats(state: AppState, session: GameSession) {
  const stats = state.userStats;
  stats.gamesPlayed++;
  stats.totalScore += session.totalScore;
  stats.averageScore = stats.totalScore / stats.gamesPlayed;
  
  if (session.totalScore > stats.bestScore) {
    stats.bestScore = session.totalScore;
  }

  // Calculate accuracy
  const totalGuesses = session.rounds.reduce((sum, round) => sum + round.totalGuesses, 0);
  const correctGuesses = session.rounds.reduce((sum, round) => {
    return sum + Object.values(round.correctGuesses).flat().length;
  }, 0);
  
  if (totalGuesses > 0) {
    const sessionAccuracy = correctGuesses / totalGuesses;
    stats.accuracyRate = (stats.accuracyRate * (stats.gamesPlayed - 1) + sessionAccuracy) / stats.gamesPlayed;
  }
}

// Persistence
export function saveToStorage() {
  try {
    appState.subscribe(state => {
      localStorage.setItem('gameState', JSON.stringify({
        userStats: state.userStats,
        settings: state.settings
      }));
    });
  } catch (error) {
    console.warn('Failed to save game state:', error);
  }
}

export function loadFromStorage() {
  try {
    const saved = localStorage.getItem('gameState');
    if (saved) {
      const data = JSON.parse(saved);
      appState.update(state => ({
        ...state,
        userStats: { ...state.userStats, ...data.userStats },
        settings: { ...state.settings, ...data.settings }
      }));
    }
  } catch (error) {
    console.warn('Failed to load game state:', error);
  }
}

function saveSettingsToStorage() {
  try {
    appState.subscribe(state => {
      localStorage.setItem('gameSettings', JSON.stringify(state.settings));
    });
  } catch (error) {
    console.warn('Failed to save settings:', error);
  }
}

// Initialize from storage on startup
if (typeof window !== 'undefined') {
  loadFromStorage();
}