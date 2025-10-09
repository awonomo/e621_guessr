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
      <div class="timer-container">
        <Timer 
          onTimeUp={handleTimeUp}
          ontogglePause={togglePause}
        />
      </div>
    {/if}
    
    <button class="icon-button skip-button" onclick={skipRound} title="Skip Round">
      ⏭️
    </button>
  </div>

  <!-- Main Game Area -->
  <div class="game-grid">
    <!-- Post Viewer Area (4/5 width) -->
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

    <!-- Scoreboard Area (1/5 width) -->
    <div class="scoreboard-area">
      <ScoreDisplay score={$currentRound?.score || 0} />
      
      <TagList 
        correctGuesses={$currentRound?.correctGuesses}
      />
      
      <div class="tag-progress">
        <span class="progress-text">{correctTags} / {totalTags} tags</span>
      </div>
    </div>
  </div>

  <!-- Guess Input (Fixed at bottom) -->
  <GuessInput 
    onsubmit={handleGuessSubmit}
    disabled={$isPaused || !$isGameActive}
  />
</div>

<style>
  .gameplay-screen {
    height: 100vh; /* Fixed height instead of min-height */
    background: var(--bg-primary);
    color: var(--text-primary);
    display: flex;
    flex-direction: column;
    overflow: hidden; /* Prevent page from growing */
  }
  
  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    position: relative;
    z-index: 100;
  }
  
  .timer-container {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 1rem;
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
    gap: 2rem;
    flex: 1;
    padding: 0 2rem;
    min-height: 0; /* Important for flex child */
    height: 100%; /* Ensure it takes full available height */
    overflow: hidden; /* Prevent grid from expanding */
  }
  
  .post-area {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    position: relative;
  }
  
  .loading-post {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 60vh;
    background: var(--bg-secondary);
    border-radius: var(--border-radius);
    color: var(--text-secondary);
    font-size: 1.25rem;
  }
  
  .scoreboard-area {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1rem 0;
    min-height: 0;
    height: 100%;
    overflow: hidden; /* Prevent scoreboard from expanding */
  }
  
  .tag-progress {
    margin-top: auto;
    padding: 1rem 0;
    text-align: center;
    border-top: 1px solid var(--bg-secondary);
  }
  
  .progress-text {
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 1.25rem;
  }
  
  /* Responsive Design */
  @media (max-width: 1200px) {
    .game-grid {
      grid-template-columns: 3fr 1fr;
    }
  }
  
  @media (max-width: 768px) {
    .game-grid {
      grid-template-columns: 1fr;
      grid-template-rows: 1fr auto;
    }
    
    .scoreboard-area {
      order: 2;
      flex-direction: row;
      gap: 1rem;
      padding: 1rem;
      background: var(--bg-secondary);
      border-radius: var(--border-radius);
    }
    
    .tag-progress {
      margin-top: 0;
      margin-left: auto;
      border-top: none;
    }
  }
</style>