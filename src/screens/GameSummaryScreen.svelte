<script lang="ts">
  import { onMount } from 'svelte';
  import { gameActions, currentSession, userStats } from '../lib/gameStore';
  import type { TagCategory, RoundData } from '../lib/types';
  import BestTagDisplay from '../components/BestTagDisplay.svelte';
  import RoundBreakdown from '../components/RoundBreakdown.svelte';
  
  let scrollContainer: HTMLElement;
  
  // Calculate game statistics
  $: totalScore = $currentSession?.totalScore || 0;
  $: isNewBest = totalScore > 0 && totalScore > ($userStats?.bestScore || 0);
  $: rounds = $currentSession?.rounds || [];
  $: totalTags = rounds.reduce((sum, round) => 
    sum + Object.values(round.post.tags).flat().length, 0);
  $: guessedTags = rounds.reduce((sum, round) => 
    sum + Object.values(round.correctGuesses).flat().length, 0);
  
  // Find best scoring tag across all rounds
  $: bestTag = findBestScoringTag();
  $: isDailyChallenge = $currentSession?.settings.mode === 'daily';
  
    function findBestScoringTag() {
    let bestTag = null;
    let bestPoints = 0;
    
    rounds.forEach(round => {
      if (round.correctGuesses) {
        Object.entries(round.correctGuesses).forEach(([category, tagEntries]) => {
          if (tagEntries) {
            tagEntries.forEach(tagEntry => {
              // Use the pre-calculated score from the backend
              if (tagEntry.score > bestPoints) {
                bestPoints = tagEntry.score;
                bestTag = { tag: tagEntry.tag, category: category as TagCategory, points: tagEntry.score };
              }
            });
          }
        });
      }
    });
    
    return bestTag;
  }
  
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

<div class="game-summary-screen">
  <!-- Static Top Bar -->
  <div class="top-bar">
    {#if !isDailyChallenge}
      <button class="icon-button home-button" on:click={returnHome} title="Return Home">
        🏠
      </button>
    {:else}
      <div></div> <!-- Spacer for daily challenge -->
    {/if}
    
    <!-- <button class="icon-button share-button" on:click={shareResults} title="Share Results">
      📤
    </button> -->
  </div>

  <!-- Scrollable Content Container -->
  <div 
    class="content-container"
    bind:this={scrollContainer}
  >
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
        
        <div class="total-score">{totalScore.toLocaleString()}</div>
        
        {#if bestTag}
          <BestTagDisplay 
            tag={bestTag.tag}
            category={bestTag.category}
            points={bestTag.points}
          />
        {/if}
        
        <div class="stats-summary">
          <span class="tags-count">{guessedTags}/{totalTags} tags</span>
        </div>
        
        <div class="action-buttons">
          {#if isDailyChallenge}
            <button class="play-again-button daily" on:click={returnHome}>
              Return Home
            </button>
          {:else}
            <button class="play-again-button" on:click={playAgain} title="Play Again">
              again
            </button>
          {/if}
        </div>
        
        <div class="scroll-prompt" class:visible={rounds.length > 0}>
          <span>round breakdown</span>
          <div class="arrow">⌄</div>
        </div>
      </div>
    </div>

    <!-- Round Breakdown Pages -->
    {#each rounds as round, index}
      <div class="round-breakdown-score"><h1 class="round-title">ROUND {index + 1}:</h1><p> {round.score.toLocaleString()} pts.</p></div>
      <RoundBreakdown roundData={round} roundNumber={index + 1} />
    {/each}
  </div>
</div>

<style>
  .game-summary-screen {
    min-height: 100vh;
    background: var(--bg-primary);
    color: var(--text-primary);
    display: flex;
    flex-direction: column;
    position: relative;
  }
  
  /* Static Elements */
  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: var(--bg-primary);
    border-bottom: 1px solid var(--bg-secondary);
  }
  
  /* Button Styles */
  .icon-button {
    background: var(--bg-secondary);
    border: 2px solid var(--accent-primary);
    border-radius: 50%;
    width: 3rem;
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .icon-button:hover {
    background: var(--accent-primary);
    color: var(--bg-primary);
    transform: scale(1.05);
  }
  
  /* Scrollable Content */
  .content-container {
    margin-top: 4rem;
    height: calc(100vh - 4rem);
    overflow-y: auto;
    scroll-behavior: smooth;
    /* Removed mandatory scroll snapping to prevent erratic jumping */
  }
  
  .summary-page {
    min-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }
  
  /* Summary Content */
  .summary-content {
    text-align: center;
    max-width: 600px;
    width: 100%;
  }
  
  .new-best-badge {
    font-size: 1.25rem;
    color: var(--text-accent);
    font-weight: 700;
    margin-bottom: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  
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
    text-shadow: 0 2px 8px rgba(252, 179, 66, 0.3);
  }
  
  .daily-challenge-date {
    font-size: 1.25rem;
    font-weight: 400;
    color: var(--text-secondary);
    margin: 0;
    text-transform: none;
    letter-spacing: 0.05em;
  }
  
  .total-score {
    font-size: 8rem;
    font-weight: 900;
    color: var(--text-accent);
    margin-bottom: 2rem;
    text-shadow: 0 2px 8px rgba(252, 179, 66, 0.3);
    font-variant-numeric: tabular-nums;
  }

   .round-breakdown-score {
    border-top: 2px dotted var(--bg-secondary);
    text-align: center;
    padding-top: 9vw;
    margin-top: 3rem;
  }

  .round-title {
    display: inline-block;
    font-size: 2.5rem;
    font-weight: 900;
    color: var(--text-accent);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin: 0;
  }

  .round-breakdown-score p {
    display: inline-block;
    font-style: italic;
    font-size: 2.5rem;
    font-weight: 200;
    color: var(--text-primary);
    margin: 0 0 0 1rem;
  }

  .stats-summary {
    font-size: 1.5rem;
    color: var(--text-secondary);
    margin-bottom: 3rem;
    font-weight: 600;
  }
  
  .action-buttons {
    margin-bottom: 4rem;
  }
  
  .play-again-button {
    background: var(--bg-light);
    color: var(--text-dark);
    border: none;
    padding: 1rem 3rem;
    font-size: 1.25rem;
    font-weight: 700;
    border-radius: 25px;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .play-again-button:hover {
    transform: scale(1.05);
  }
  
  .play-again-button.daily {
    background: var(--bg-secondary);
    color: var(--text-primary);
    animation: none;
  }
  
  .scroll-prompt {
    opacity: 0;
    transition: opacity 0.3s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-secondary);
    font-size: 1.25rem;
  }
  
  .scroll-prompt.visible {
    opacity: 1;
  }
  
  .arrow {
    font-size: 2rem;
    animation: bounce 2s infinite;
  }
  
  /* Animations */
  @keyframes glow {
    0%, 100% {
      box-shadow: 0 0 20px rgba(252, 179, 66, 0.3);
    }
    50% {
      box-shadow: 0 0 30px rgba(252, 179, 66, 0.6);
    }
  }
  
  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-10px);
    }
    60% {
      transform: translateY(-5px);
    }
  }
  
  /* Responsive Design */
  @media (max-width: 768px) {
    .total-score {
      font-size: 3.5rem;
    }
    
    .stats-summary {
      font-size: 1.25rem;
    }
    
    .play-again-button {
      padding: 0.875rem 2rem;
      font-size: 1.125rem;
    }
  }
</style>