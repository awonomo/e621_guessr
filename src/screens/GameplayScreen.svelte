<script lang="ts">
  import { gameActions, isGameActive, isPaused, currentRound, currentSession } from '../lib/gameStore.js';
  import PostViewer from '../components/PostViewer.svelte';
  import GuessInput from '../components/GuessInput.svelte';
  import TagList from '../components/TagList.svelte';
  import Timer from '../components/Timer.svelte';
  import ScoreDisplay from '../components/ScoreDisplay.svelte';

  async function handleGuessSubmit(event: { guess: string }) {
    if (!$isPaused && $isGameActive) {
      try {
        const result = await gameActions.submitGuess(event.guess);
        
        // Handle rate limiting feedback
        if (result.rateLimited) {
          // Show rate limiting message (you could add a feedback system here)
          console.warn('Rate limited: Too many incorrect guesses');
        }
        
        // Return the result so GuessInput can handle it
        return result;
      } catch (error) {
        console.error('Error submitting guess:', error);
        return { error: true };
      }
    }
    return null;
  }

  function togglePause() {
    gameActions.togglePause();
  }
  
  function handleTimeUp() {
    // Handle when timer reaches zero
    gameActions.endRound();
  }
  
  function quitGame() {
    // if (confirm('Are you sure you want to quit? Your progress will be lost.')) {
      gameActions.resetGame();
    // }
  }
  
  function skipRound() {
    gameActions.endRound();
  }
  
  // Calculate tag progress using $derived
  let totalTags = $derived($currentRound?.post.tags ? 
    Object.values($currentRound.post.tags).flat().length : 0);
  
  let correctTags = $derived($currentRound?.correctGuesses ?
    Object.values($currentRound.correctGuesses).flat().length : 0);

  // Pause count for showing skip button on pause overlay
  let pausesRemaining = $derived(3 - ($currentRound?.pauseCount || 0));
  let pauseLimitReached = $derived(pausesRemaining <= 0);
  
  function handleKeydown(e: KeyboardEvent) {
    if (!$isGameActive) return;
    
    // Escape to pause/unpause
    if (e.key === 'Escape') {
      e.preventDefault();
      togglePause();
    }
    
    // Shift+Enter to skip round
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      skipRound();
    }
  }

</script>

<svelte:window on:keydown={handleKeydown} />

<div class="gameplay-screen">
  <!-- Top UI Bar (Desktop only) -->
  <div class="top-bar">
    <button class="icon-button quit-button" onclick={quitGame} title="Quit Game">
      ✕
    </button>
    <h1 class="logo-header">e621_guessr</h1>
    <div style="flex:1"></div>
    <button class="icon-button skip-button" onclick={skipRound} title="Skip Round">
      ⏭
    </button>
  </div>

  <!-- Main Game Area -->
  <div class="game-grid">

    <!-- Desktop: Round Title -->
    <h2 class="round-title">Round {($currentSession?.currentRound || 0) + 1}</h2>
    
    <!-- Desktop: Timer -->
      <div class="timer-area">
        <Timer 
          onTimeUp={handleTimeUp}
          ontogglePause={togglePause}
          onSkip={skipRound}
          variant="desktop"
        />
      </div>
    
    <!-- Mobile: Timer and Score Row -->
    <div class="mobile-header">
      {#if $currentSession?.settings.mode !== 'endless'}
        <div class="timer-container-mobile">
          <Timer 
            onTimeUp={handleTimeUp}
            ontogglePause={togglePause}
            onSkip={skipRound}
            variant="mobile"
          />
        </div>
      {/if}
      <div class="score-display-mobile">
        <ScoreDisplay score={$currentRound?.score || 0} />
      </div>
    </div>

    <!-- Desktop: Score Display Area -->
    <div class="score-display-area">
      <ScoreDisplay score={$currentRound?.score || 0} />
    </div>

    <!-- Post Viewer Area -->
    <div class="post-area">
      {#if $currentRound?.post}
        <PostViewer 
          post={$currentRound.post} 
          isPaused={$isPaused}
          {quitGame}
          {skipRound}
          {pausesRemaining}
          {pauseLimitReached}
          roundNumber={($currentSession?.currentRound || 0) + 1}
          totalRounds={$currentSession?.settings.mode === 'endless' ? undefined : $currentSession?.settings.totalRounds}
        />
      {:else}
        <div class="loading-post">
          <p>Loading image...</p>
        </div>
      {/if}
    </div>

    <!-- Scoreboard Area (Desktop only) -->
    <div class="tag-list">
      <TagList 
        roundData={$currentRound}
      />
    </div>
      
      <div class="tag-progress">
        <span class="progress-text">{correctTags} / {totalTags} tags</span>
      </div>
    

     <!-- Guess Input -->
    <div class="guess-input-area">
      <GuessInput 
        onsubmit={handleGuessSubmit}
        disabled={$isPaused || !$isGameActive}
      />
    </div>

  </div> <!-- End of game-grid! -->
</div>

<style>
  .gameplay-screen {
    height: 100vh;
    height: 100dvh; /* Use dynamic viewport height for Safari/Chrome mobile */
    max-height: 100vh;
    max-height: 100dvh;
    background: var(--bg-primary);
    color: var(--text-primary);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
  
  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    position: relative;
    z-index: 100;
    flex-shrink: 0;
  }

  .logo-header {
    padding-left: 3rem;
    text-align: left;
    font-variant: italic;
    font-size: 2rem;
    font-weight: 200;
    letter-spacing: 0.1em;
    color: var(--text-accent);
    margin: 0;
  }
  
  .icon-button {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: none;
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    font-size: 1.25rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .icon-button:hover {
    background: var(--bg-accent);
    color: var(--bg-primary);
    transform: scale(1.1);
  }
  
  .game-grid {
    display: grid;
    grid-template-columns: 4fr 1fr;
    grid-template-rows: 0.5fr 1fr 5fr auto auto;
    gap: 1rem;
    flex: 1;
    padding: 0 2rem 0rem 2rem;
    min-height: 0; 
    overflow: hidden;
    box-sizing: border-box;
  }

  /* Desktop styles */
  .round-title {
    grid-column: 2;
    grid-row: 1;
    padding-top: 1.5rem;
    padding-bottom: 1rem;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 300;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--bg-secondary);
  }
  
  .timer-area {
    grid-column: 2;
    grid-row: 5;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0.5rem 0;
  }
  
  /* Mobile header - hidden on desktop */
  .mobile-header {
    display: none;
  }
  
  .timer-container-mobile {
    flex: 1;
    display: flex;
    justify-content: flex-start;
  }
  
  .score-display-mobile {
    flex: 1;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding-right: 1.5rem;
  }
  
  .guess-input-area {
    grid-row: 5;
    grid-column: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem 0;
    order: 1;
  }
  
  .score-display-area {
    grid-row: 2;
    grid-column: 2; 
  }
  
  .post-area {
    grid-column: 1;
    grid-row: 1 / 5;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    overflow: hidden;
    position: relative;
  }
  
  .loading-post {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    max-height: 60vh;
    background: var(--bg-secondary);
    border-radius: var(--border-radius);
    color: var(--text-secondary);
    font-size: 1.25rem;
  }
  
  .tag-list {
    grid-column: 2;
    grid-row: 3 / 4;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1rem 0;
    min-height: 0;
    overflow: hidden;
  }
  
  .tag-progress {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    grid-column: 2;
    grid-row: 4;
    text-align: center;
    border-top: 1px solid var(--bg-secondary);
    height: 100%;
  }
  
  .progress-text {
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 1.25rem;
  }
  
  /* breakpoint */
  @media (max-width: 1200px) {
    .game-grid {
      grid-template-columns: 3fr 1fr;
    }
  }
  
  @media (max-width: 768px) {
    .gameplay-screen {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      height: 100vh;
      height: 100dvh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* Hide top bar on mobile */
    .top-bar {
      display: none;
    }

    .logo-header {
      display: none;
    }
    
    .game-grid {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
      position: relative;
      gap: 0rem;
      padding: 0rem;
    }

    /* Hide desktop round title on mobile */
    .round-title {
      display: none;
    }
    
    /* Hide desktop timer on mobile */
    .timer-area {
      display: none;
    }

    /* Show mobile header with timer and score */
    .mobile-header {
      display: flex;
      gap: 0rem;
      align-items: center;
      padding: 0rem 0rem;
      background: var(--bg-primary);
      flex-shrink: 0;
      z-index: 20;
      border-bottom: 1px solid var(--bg-secondary);
      order: 1;
    }

    .score-display-area {
      display: none;
    }

    .progress-text {
      display:none
    }

    .post-area {
      order: 2;
      flex: 1;
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: auto;
      padding: 0.5rem 1rem;
      -webkit-overflow-scrolling: touch;
    }

    .guess-input-area {
      order: 3;
      flex-shrink: 0;
      padding: 0.75rem 1rem;
      background: var(--bg-primary);
      position: relative;
      z-index: 20;
      border-top: 1px solid var(--bg-secondary);
    }
    
    .tag-list {
      display: none;
    }

    .tag-progress {
      display: none;
    }

    .skip-button {
      color: var(--text-light);
    }
  }
</style>