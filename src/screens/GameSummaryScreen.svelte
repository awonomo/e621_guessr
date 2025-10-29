<script lang="ts">
  import { onMount } from 'svelte';
  import { gameActions, currentSession, userStats } from '../lib/gameStore';
  import type { TagCategory, RoundData } from '../lib/types';
  import { findBestScoringTag } from '../lib/utils';
  import BestTagDisplay from '../components/BestTagDisplay.svelte';
  import RoundBreakdown from '../components/RoundBreakdown.svelte';
  import "../styles/summary-screen.css";
  import Footer from '../components/Footer.svelte';
  
  // Calculate game statistics
  $: totalScore = $currentSession?.totalScore || 0;
  $: isNewBest = totalScore > 0 && totalScore > ($userStats?.bestScore || 0);
  $: rounds = $currentSession?.rounds || [];
  $: totalTags = rounds.reduce((sum, round) => 
    sum + Object.values(round.post.tags).flat().length, 0);
  $: guessedTags = rounds.reduce((sum, round) => 
    sum + Object.values(round.correctGuesses).flat().length, 0);
  
  // Find best scoring tag across all rounds
  $: bestTag = findBestScoringTag(rounds);
  $: isDailyChallenge = $currentSession?.settings.mode === 'daily';
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      playAgain();
    }
  }
  
  function returnHome() {
    gameActions.resetGame();
  }
  
  function playAgain() {
    if (!$currentSession) return;
    
    // Start new game with same settings
    gameActions.restartWithSameSettings();
  }
  
  function shareResults() {
    // TODO: Implement sharing functionality
    console.log('Share functionality to be implemented');
  }
  
  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
  
    
    // Auto-submit daily challenge results
    if ($currentSession && isDailyChallenge) {
      gameActions.submitDailyChallengeResult($currentSession);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<div class="game-summary-screen summary-screen-base">
  <!-- Static Top Bar -->
  <div class="top-bar">
      <button class="icon-button home-button" on:click={returnHome} title="Return Home">
        ✕
      </button>
      <h1 class="logo-header">e621_guessr</h1>
    <!-- <div class="flex-spacer" style="flex:1"></div> -->
    <button class="icon-button" on:click={playAgain} title="Play Again">
      ↻
    </button>
  </div>
    <!-- Page 0: Game Summary -->
    <div class="summary-page">
      <div class="summary-content">
        {#if isDailyChallenge}
          <div class="daily-challenge-header">
            <h1 class="daily-challenge-title">Daily Challenge</h1>
            <h2 class="daily-challenge-date">{new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</h2>
          </div>
        {/if}
        
        {#if isNewBest}
          <div class="new-best-badge">New Best!</div>
        {/if}
        
        {#if !isDailyChallenge}
          <h1 class="game-title">GAME:</h1>
        {/if}
        <div class="score-heading glowing">{totalScore.toLocaleString()}</div>
        
        {#if bestTag}
          <BestTagDisplay 
            tag={bestTag.tag}
            category={bestTag.category}
            points={bestTag.points}
          />
        {/if}
         
        <div class="action-buttons">
          {#if isDailyChallenge}
            <button class="play-again-button daily" on:click={returnHome}>
              home
            </button>
          {:else}
            <button class="play-again-button" on:click={playAgain} title="Play Again">
              again
            </button>
          {/if}
          <button class="share-button" title="share score" on:click={shareResults}>share</button>
        </div>
        
        <div class="scroll-prompt" class:visible={rounds.length > 0}>
          <span>{guessedTags}/{totalTags} tags guessed</span>
          <div class="arrow">⌄</div>
        </div>
      </div>
    </div>

    <!-- Round Breakdown Pages -->
    {#each rounds as round, index}
      <div class="round-breakdown-header">
        <h1 class="round-title">ROUND {index + 1}:</h1>
        <p class="round-score-text">{round.score.toLocaleString()} pts.</p>
      </div>
      <div class="breakdown-page">
        <RoundBreakdown roundData={round} roundNumber={index + 1} />
      </div>
    {/each}
    <Footer />
</div>

<style>
  /* GameSummaryScreen-specific styles only */
  
  /* Daily Challenge Header */
  .daily-challenge-header {
    text-align: center;
    margin-bottom: 2rem;
  }
  
  .daily-challenge-title {
    font-size: 2.5rem;
    font-weight: 800;
    color: var(--text-accent);
    margin: 0 0 0.5rem 0;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  
  .daily-challenge-date {
    font-size: 1.25rem;
    font-weight: 400;
    color: var(--text-secondary);
    margin: 0;
    text-transform: none;
    letter-spacing: 0.05em;
  }
  
  /* New Best Badge */
  .new-best-badge {
    font-size: 1.25rem;
    color: var(--text-accent);
    font-weight: 700;
    margin-bottom: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  
  /* Game Title (above score) */
  .game-title {
    font-size: 2rem;
    font-weight: 900;
    color: var(--text-secondary);
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  
  /* Action Buttons */
  .action-buttons {
    margin-bottom: 2rem;
  }

  .action-buttons button {
    margin: 1rem;
    font-size: 2rem;
    color: var(--text-dark);
    border: none;
    padding: 1rem 3rem;
    font-weight: 700;
    border-radius: 25px;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .play-again-button {
    background: var(--bg-light);
  }

  .share-button {
    background: var(--bg-light);
  }
  
  .action-buttons button:hover {
    transform: scale(1.05);
  }
  
  .play-again-button.daily {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }
  
  /* Round Breakdown Headers (for scrollable list of rounds) */
  .round-breakdown-header {
    text-align: center;
    padding: 4rem 0 0 0;
    border-top: 2px dotted var(--bg-secondary);
  }
  
  /* Override .round-title for breakdown headers */
  .round-breakdown-header .round-title {
    display: inline-block;
    font-size: 2.5rem;
    color: var(--text-accent);
    text-shadow: 0 2px 8px rgba(252, 179, 66, 0.3);
  }

  .round-score-text {
    display: inline-block;
    font-style: italic;
    font-size: 2.5rem;
    font-weight: 200;
    color: var(--text-primary);
    margin: 0 0 0 1rem;
  }
  
  /* Game Summary specific breakdown page styling */
  .breakdown-page {
    /* Override shared styles for game summary */
    position: relative;
    top: auto;
    min-height: auto;
    padding: 2rem 0;
    padding-bottom: 8rem;
  }
  
  /* Game Summary specific summary page styling */
  .summary-page {
    /* Override shared styles for game summary */
    position: relative;
    top: auto;
    min-height: 100vh;
    min-height: 100dvh;
  }
  
  /* Responsive Design */
  @media (max-width: 768px) {
    .score-heading {
      font-size: 3.5rem !important;
    }
    
    .action-buttons button {
      padding: 0.875rem 2rem;
      font-size: 1.125rem;
    }

    .daily-challenge-title {
      font-size: 2rem;
      padding-top: 7rem;
    }
  }
</style>