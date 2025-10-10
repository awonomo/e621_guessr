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
    if (confirm('Are you sure you want to quit? Your progress will be lost.')) {
      gameActions.resetGame();
    }
  }
  
  function skipRound() {
    if (confirm('Skip to the next round?')) {
      gameActions.endRound();
    }
  }
  
  // Calculate tag progress using $derived
  let totalTags = $derived($currentRound?.post.tags ? 
    Object.values($currentRound.post.tags).flat().length : 0);
  
  let correctTags = $derived($currentRound?.correctGuesses ?
    Object.values($currentRound.correctGuesses).flat().length : 0);
</script>

<div class="gameplay-screen">
  <!-- Top UI Bar -->
  <div class="top-bar">
    <button class="icon-button quit-button" onclick={quitGame} title="Quit Game">
      ✕
    </button>
    
    {#if $currentSession?.settings.mode !== 'endless'}
      <div class="timer-container timer-container-mobile">
        <Timer 
          onTimeUp={handleTimeUp}
          ontogglePause={togglePause}
          variant="mobile"
        />
      </div>
    {/if}
    
    <button class="icon-button skip-button" onclick={skipRound} title="Skip Round">
      ⏭
    </button>
  </div>

  <!-- Main Game Area -->
  <div class="game-grid">
    <!-- Score Display Area (Mobile Only) -->
    <div class="score-display-area">
      <ScoreDisplay score={$currentRound?.score || 0} />
    </div>

    <!-- Post Viewer Area -->
    <div class="post-area">
      {#if $currentRound?.post}
        <PostViewer 
          post={$currentRound.post} 
          isPaused={$isPaused}
        />
      {:else}
        <div class="loading-post">
          <p>Loading image...</p>
        </div>
      {/if}
    </div>

    <!-- Scoreboard Area -->
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

    {#if $currentSession?.settings.mode !== 'endless'}
      <div class="timer-container timer-container-desktop">
        <Timer 
          onTimeUp={handleTimeUp}
          ontogglePause={togglePause}
          variant="desktop"
        />
      </div>
    {/if}

  </div> <!-- End of game-grid! -->
</div>

<style>
  .gameplay-screen {
    height: 100vh;
    max-height: 100vh;
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
  
  .timer-container {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .timer-container-mobile {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    display: none;
  }
  
  .timer-container-desktop {
    grid-column: 1 / -1;
    grid-row: 2;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 1rem 0;
    margin-bottom: 1rem;
    order: 2;
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
    grid-template-rows: 1fr 5fr auto auto;
    gap: 1rem;
    flex: 1;
    padding: 0 2rem 0rem 2rem;
    min-height: 0; 
    overflow: hidden;
    box-sizing: border-box;
  }
  
  .guess-input-area {
    grid-row: 4;
    grid-column: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem 0;
    order: 1;
  }
  
  .score-display-area {
    grid-row: 1;
    grid-column: 2; 
  }
  
  .post-area {
    grid-column: 1;
    grid-row: 1 / 4;
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
    grid-row: 2 / 3;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1rem 0;
    min-height: 0;
    overflow: hidden;
  }
  
  .tag-progress {
    padding: 1rem;
    grid-column: 2;
    grid-row: 3;
    text-align: center;
    border-top: 1px solid var(--bg-secondary);
  }
  
  .progress-text {
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 1.25rem;
  }

  .timer-container-desktop {
    grid-column: 2;
    grid-row: 4;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0.25rem 0;
    background-color: transparent;
    color: var(--bg-primary);
  }
  
  /* breakpoint */
  @media (max-width: 1200px) {
    .game-grid {
      grid-template-columns: 3fr 1fr;
    }
  }
  
  @media (max-width: 768px) {
    .gameplay-screen {
      position: relative;
    }
    
    .game-grid {
      grid-template-columns: 1fr 1fr 1fr;
      grid-template-rows: auto 1fr 5fr 0.5fr;
      padding: 0 1rem 1rem 1rem;
    }

    .score-display-area {
      grid-column: 2;
      grid-row: 1;
      display: block;
      padding: 0 0;
      text-align: center;
    }

    .post-area {
      grid-column: 1 / 4;
      grid-row: 3;
    }

    .guess-input-area {
      grid-column: 1 / 4;
      grid-row: 4;
      order: 1;
    }

    .timer-container-mobile {
      display: flex;
    }
    
    .timer-container-desktop {
      display: none;
    }
    
    .tag-list {
      grid-column: 1 / 4;
      grid-row: 2;
      order: 2;
      flex-direction: row;
      padding: 0;
      border-radius: 8px;
    }

    .tag-progress {
      grid-column: 3;
      grid-row: 1;
      margin-top: 0;
      border-top: none;
    }

    .skip-button {
      color: var(--text-light);
    }
  }
</style>