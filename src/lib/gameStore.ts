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

// Player ID management
function getOrCreatePlayerId(): string {
  let playerId = localStorage.getItem('playerId');
  if (!playerId) {
    playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('playerId', playerId);
    console.log('[GameStore] Created new player ID:', playerId);
  }
  return playerId;
}

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
    dailyChallengesCompleted: 0,
    bestTag: null
  },
  settings: {
    soundEnabled: true,
    theme: 'dark',
    animations: true,
    autoAdvanceRounds: false
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
  const round = $state.currentSession.rounds[$state.currentSession.currentRound] || null;
  return round;
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
    appState.update(state => {
      return {
        ...state,
        currentState: 'home'
      };
    });
  },

  navigateToSetup() {
    appState.update(state => {
      return {
        ...state,
        currentState: 'setup'
      };
    });
  },

  startGame(settings: GameSettings, posts: Post[]) {
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
      startedAt: now,
      pauseCount: 0
    }));

    appState.update(state => {
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
      this.preloadCurrentRoundImage();
    }, 100);
  },

  async startRound() {
    try {
      // Preload current round image before transitioning to playing state
      await this.preloadCurrentRoundImage();
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
      
      currentRoundData.startedAt = new Date();
      currentRoundData.timeRemaining = currentRoundData.timeLimit;
      
      return {
        ...state,
        currentState: 'playing',
        isPaused: false // Ensure game is not paused when starting a round
      };
    });
  },

  async submitGuess(guess: string): Promise<GuessResult> {
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
    
    // Check if guess matches custom criteria (blocked tags) - before aliasing
    if (session.settings.customCriteria) {
      const customCriteriaTags = session.settings.customCriteria
        .split(/\s+/)
        .map(tag => tag.trim().toLowerCase().replace(/\s+/g, '_'))
        .filter(tag => tag.length > 0);
      
      // Direct match check
      if (customCriteriaTags.includes(normalizedGuess)) {
        return { 
          guess, 
          score: 0, 
          isCorrect: false,
          blockedByCustomCriteria: true
        };
      }
    }
    
    // Rate limiting check - more lenient: 6 incorrect guesses in 15 seconds
    const now = Date.now();
    const fifteenSecondsAgo = now - 15000;
    const recentIncorrectGuesses = round.incorrectGuessTimestamps.filter(timestamp => timestamp > fifteenSecondsAgo);
    
    if (recentIncorrectGuesses.length >= 6) {
      console.warn('[GameStore] Rate limited - too many incorrect guesses');
      return { 
        guess, 
        score: 0, 
        isCorrect: false, 
        rateLimited: true 
      };
    }

    // Step 1: Check if guess matches any tag on the post
    let matchedTag: string | null = null;
    let matchedCategory: TagCategory | undefined;
    
    for (const [cat, tags] of Object.entries(round.post.tags)) {
      const tagCategory = cat as TagCategory;
      
      if (tags.some(tag => tag.toLowerCase() === normalizedGuess)) {
        matchedTag = tags.find(tag => tag.toLowerCase() === normalizedGuess) || null;
        matchedCategory = tagCategory;
        break;
      }
    }

    if (!matchedTag) {
      // Step 2: No direct match - check if guess resolves to a tag on this post via alias
      
      try {
        // Resolve the guess to its canonical tag name (if it's an alias)
        const resolvedTag = await backendApi.resolveTag(normalizedGuess);
        
        if (resolvedTag) {
          // Check if resolved tag is blocked by custom criteria
          if (session.settings.customCriteria) {
            const customCriteriaTags = session.settings.customCriteria
              .split(/\s+/)
              .map(tag => tag.trim().toLowerCase().replace(/\s+/g, '_'))
              .filter(tag => tag.length > 0);
            
            if (customCriteriaTags.includes(resolvedTag.toLowerCase())) {
              return { 
                guess, 
                score: 0, 
                isCorrect: false,
                blockedByCustomCriteria: true
              };
            }
          }
          
          // Now check if this resolved tag is on the current post
          for (const [cat, tags] of Object.entries(round.post.tags)) {
            const tagCategory = cat as TagCategory;
            
            if (tags.some(tag => tag.toLowerCase() === resolvedTag.toLowerCase())) {
              matchedTag = resolvedTag;
              matchedCategory = tagCategory;
              
              // Now score the confirmed tag
              const backendResult = await backendApi.scoreTag(resolvedTag);
              if (backendResult && backendResult.isCorrect) {
                
                // Mark this as an alias match with slight point deduction
                const aliasResult = await this.processCorrectGuess(
                  guess, 
                  matchedTag, 
                  matchedCategory, 
                  backendResult.score * 0.9, // 10% deduction for alias
                  true // wasFromAlias
                );
                
                return aliasResult;
              } else {
                console.warn('[GameStore] Backend failed to score resolved tag:', resolvedTag);
              }
            }
          }
        } else {
        }
      } catch (error) {
        console.warn('[GameStore] Alias resolution failed:', error);
      }
      
      // Step 3: No match found - record as incorrect
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
      return { 
        guess, 
        score: 0, 
        isCorrect: false 
      };
    }

    // Step 4: Valid new guess - get score from backend
    try {
      const backendResult = await backendApi.scoreTag(matchedTag);
      const score = backendResult?.score || this.fallbackScore(matchedTag, matchedCategory!);
      
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
        wasFromAlias,
        timestamp: Date.now()
      };

      // Add to correct guesses (by category)
      const newCorrectGuesses = { ...round.correctGuesses };
      if (!newCorrectGuesses[category]) {
        newCorrectGuesses[category] = [];
      }
      newCorrectGuesses[category] = [...(newCorrectGuesses[category] || []), tagEntry];

      // Create new round object with updated data
      const newRound = {
        ...round,
        correctGuesses: newCorrectGuesses,
        score: round.score + tagEntry.score,
        totalGuesses: round.totalGuesses
      };
      
      // Create new session with updated round and total score
      const newSession = {
        ...session,
        rounds: session.rounds.map((r, index) => 
          index === session.currentRound ? newRound : r
        ),
        totalScore: session.totalScore + tagEntry.score
      };
      
      // Update stats and return completely new state
      const newUserStats = {
        ...state.userStats,
        totalTagsGuessed: state.userStats.totalTagsGuessed + 1
      };
      
      // Check if this is the new best tag
      if (!newUserStats.bestTag || tagEntry.score > newUserStats.bestTag.score) {
        newUserStats.bestTag = {
          tag: guess,
          category,
          score: tagEntry.score
        };
      }
      
      const newState = {
        ...state,
        currentSession: newSession,
        userStats: newUserStats
      };
      
      return newState;
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
      }
      
      return {
        ...state,
        currentState: 'roundSummary'
      };
    });
  },

  nextRound() {
    appState.update(state => {
      if (!state.currentSession) {
        console.error('[GameStore] Cannot advance round - no active session');
        return state;
      }
      
      const currentRoundIndex = state.currentSession.currentRound;
      const totalRounds = state.currentSession.rounds.length;
      const canAdvance = currentRoundIndex < totalRounds - 1;
      
      if (canAdvance) {
        const nextRoundIndex = currentRoundIndex + 1;
        
        // Start preloading the next round's image in background
        setTimeout(() => {
          this.preloadNextRoundImage();
        }, 1000);
        
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
        const session = state.currentSession;
        session.endedAt = new Date();
        session.isActive = false;
        
        // Update stats
        updateUserStats(state, session);
        
        return {
          ...state,
          currentState: 'gameSummary'
        };
      }
    });
  },

  togglePause() {
    appState.update(state => {
      if (state.currentState !== 'playing') {
        console.warn('[GameStore] Cannot pause - not in playing state');
        return state;
      }
      
      const session = state.currentSession;
      if (!session) return state;
      
      const currentRound = session.rounds[session.currentRound];
      if (!currentRound) return state;
      
      // Check pause limit (3 pauses per round)
      const MAX_PAUSES = 3;
      const isTryingToPause = !state.isPaused;
      
      if (isTryingToPause && currentRound.pauseCount >= MAX_PAUSES) {
        console.warn(`[GameStore] Pause limit reached (${MAX_PAUSES} pauses per round)`);
        // Could dispatch a user notification here
        return state;
      }
      
      // Increment pause count when pausing (not when unpausing)
      if (isTryingToPause) {
        currentRound.pauseCount++;
      }
      
      const newPauseState = !state.isPaused;
      
      return {
        ...state,
        isPaused: newPauseState
      };
    });
  },

  resetGame() {
    appState.update(state => {
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
        round.endedAt = new Date();
        
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

  async startDailyChallenge() {
    try {
      // Get today's date in Central Standard Time (CST)
      const now = new Date();
      const cstOffset = -6; // CST is UTC-6
      const cstTime = new Date(now.getTime() + (cstOffset * 60 * 60 * 1000));
      const today = cstTime.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Get or create unique player ID
      const playerId = getOrCreatePlayerId();
      
      // Check if player has already completed today's challenge
      const statusResponse = await fetch(`/api/daily/${today}/status?player_name=${encodeURIComponent(playerId)}`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        if (statusData.completed) {
          console.log('[GameStore] Player has already completed daily challenge, showing results');
          
          // Get the daily challenge data to reconstruct the session
          const challengeResponse = await fetch(`/api/daily/${today}`);
          if (!challengeResponse.ok) {
            alert('Failed to load daily challenge data');
            return;
          }
          
          const challengeData = await challengeResponse.json();
          
          // Reconstruct the completed game session
          await this.showCompletedDailyChallenge(challengeData, statusData.result);
          return;
        }
      }
      
      // Load the daily challenge posts
      const response = await fetch(`/api/daily/${today}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[GameStore] Daily challenge error:', response.status, errorText);
        alert(`Failed to load daily challenge: HTTP ${response.status}`);
        return;
      }
      
      const data = await response.json();
      
      // Create game settings from daily challenge config
      const gameSettings: GameSettings = {
        mode: 'daily',
        totalRounds: data.config.ROUNDS,
        timeLimit: data.config.TIME_LIMIT,
        ratings: ['safe', 'questionable', 'explicit'],
        minUpvotes: data.config.MIN_POST_SCORE || 10,
        customCriteria: ''
      };
      
      // Store the daily challenge info in state
      appState.update(state => ({
        ...state,
        dailyChallenge: {
          date: data.date,
          posts: data.posts,
          settings: {
            totalRounds: gameSettings.totalRounds,
            timeLimit: gameSettings.timeLimit,
            ratings: gameSettings.ratings,
            minUpvotes: gameSettings.minUpvotes,
            customCriteria: gameSettings.customCriteria
          }
        }
      }));
      
      // Start the game using the existing startGame method
      this.startGame(gameSettings, data.posts);
      
    } catch (error) {
      console.error('[GameStore] Failed to load daily challenge:', error);
      alert(`Network error loading daily challenge: ${error.message}`);
    }
  },

  async showCompletedDailyChallenge(challengeData: any, resultData: any) {
    console.log('[GameStore] Reconstructing completed daily challenge session');
    
    // Create game settings from daily challenge config
    const gameSettings: GameSettings = {
      mode: 'daily',
      totalRounds: challengeData.config.ROUNDS,
      timeLimit: challengeData.config.TIME_LIMIT,
      ratings: ['safe', 'questionable', 'explicit'],
      minUpvotes: challengeData.config.MIN_POST_SCORE || 10,
      customCriteria: ''
    };

    // Store the daily challenge info in state
    appState.update(state => ({
      ...state,
      dailyChallenge: {
        date: challengeData.date,
        posts: challengeData.posts,
        settings: {
          totalRounds: gameSettings.totalRounds,
          timeLimit: gameSettings.timeLimit,
          ratings: gameSettings.ratings,
          minUpvotes: gameSettings.minUpvotes,
          customCriteria: gameSettings.customCriteria
        }
      }
    }));

    // Reconstruct the completed game session from stored rounds data
    const completedSession: GameSession = {
      id: `daily-${challengeData.date}`,
      settings: gameSettings,
      rounds: resultData.rounds.map((roundData: any, index: number) => ({
        post: challengeData.posts[index],
        timeLimit: gameSettings.timeLimit,
        timeRemaining: 0, // Round is completed
        correctGuesses: roundData.correctGuesses || {},
        totalGuesses: roundData.totalGuesses || 0,
        incorrectGuesses: roundData.incorrectGuesses || 0,
        incorrectGuessTimestamps: roundData.incorrectGuessTimestamps || [],
        score: roundData.score || 0,
        startedAt: new Date(roundData.startedAt || resultData.completed_at),
        endedAt: new Date(roundData.endedAt || resultData.completed_at),
        pauseCount: roundData.pauseCount || 0
      })),
      currentRound: gameSettings.totalRounds - 1, // Last round
      totalScore: resultData.score,
      startedAt: new Date(resultData.completed_at),
      endedAt: new Date(resultData.completed_at),
      isActive: false // Game is completed
    };

    // Set the reconstructed session and navigate to game summary
    appState.update(state => ({
      ...state,
      currentSession: completedSession,
      currentState: 'gameSummary'
    }));
  },

  async submitDailyChallengeResult(session: GameSession): Promise<void> {
    if (session.settings.mode !== 'daily' || !session.endedAt) {
      return; // Not a completed daily challenge
    }

    try {
      const playerId = getOrCreatePlayerId();
      const now = new Date();
      const cstOffset = -6; // CST is UTC-6
      const cstTime = new Date(now.getTime() + (cstOffset * 60 * 60 * 1000));
      const today = cstTime.toISOString().split('T')[0]; // YYYY-MM-DD format

      const response = await fetch(`/api/daily/${today}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player_name: playerId,
          score: session.totalScore,
          rounds: session.rounds.map(round => ({
            score: round.score,
            totalGuesses: round.totalGuesses,
            incorrectGuesses: round.incorrectGuesses,
            correctGuesses: round.correctGuesses,
            startedAt: round.startedAt.toISOString(),
            endedAt: round.endedAt?.toISOString() || new Date().toISOString(),
            pauseCount: round.pauseCount
          }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[GameStore] Daily challenge result submitted successfully:', data);
      } else {
        const errorData = await response.json();
        if (response.status === 409) {
          // Already submitted - this is fine, don't show error
          console.log('[GameStore] Daily challenge already submitted');
        } else {
          console.error('[GameStore] Failed to submit daily challenge result:', errorData);
        }
      }
    } catch (error) {
      console.error('[GameStore] Error submitting daily challenge result:', error);
    }
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
    
    if (imageUrl) {
      try {
        await this.preloadImage(imageUrl);
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
      const imageUrl = nextRound.post.sample?.url || 
                       nextRound.post.file?.url || 
                       (nextRound.post as any).file_url;
      
      if (imageUrl) {
        try {
          await this.preloadImage(imageUrl);
        } catch (error) {
          console.error('[GameStore] Failed to preload next round image:', error);
        }
      } else {
        console.warn('[GameStore] No image URL found for next round');
      }
    } else {
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
    const playerId = getOrCreatePlayerId();
    appState.subscribe(state => {
      localStorage.setItem(`gameState_${playerId}`, JSON.stringify({
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
    const playerId = getOrCreatePlayerId();
    const saved = localStorage.getItem(`gameState_${playerId}`);
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
    const playerId = getOrCreatePlayerId();
    appState.subscribe(state => {
      localStorage.setItem(`gameSettings_${playerId}`, JSON.stringify(state.settings));
    });
  } catch (error) {
    console.warn('Failed to save settings:', error);
  }
}

// Initialize from storage on startup
if (typeof window !== 'undefined') {
  loadFromStorage();
}