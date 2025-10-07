<script lang="ts">
  import { onMount } from 'svelte';
  import { gameActions, currentSession, userStats } from '../lib/gameStore';
  import type { TagCategory, RoundData } from '../lib/types';
  import BestTagDisplay from '../components/BestTagDisplay.svelte';
  import RoundBreakdown from '../components/RoundBreakdown.svelte';
  
  let scrollContainer: HTMLElement;
  let currentPage = $state(0); // 0 = summary, 1+ = round breakdowns
  let isScrolling = $state(false);
  
  // Calculate game statistics using $derived
  let totalScore = $derived($currentSession?.totalScore || 0);
  let isNewBest = $derived(totalScore > 0 && totalScore > ($userStats?.bestScore || 0));
  let rounds = $derived($currentSession?.rounds || []);
  let totalTags = $derived(rounds.reduce((sum, round) => 
    sum + Object.values(round.post.tags).flat().length, 0));
  let guessedTags = $derived(rounds.reduce((sum, round) => 
    sum + Object.values(round.correctGuesses).flat().length, 0));
  
  // Find best scoring tag across all rounds
  let bestTag = $derived(findBestScoringTag());
  let isDailyChallenge = $derived($currentSession?.settings.mode === 'daily');
  
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
  
  function handleScroll(event: WheelEvent) {
    if (isScrolling) return;
    
    const direction = Math.sign(event.deltaY);
    const maxPages = rounds.length; // summary + round pages
    
    if (direction > 0 && currentPage < maxPages) {
      // Scrolling down
      scrollToPage(currentPage + 1);
      event.preventDefault();
    } else if (direction < 0 && currentPage > 0) {
      // Scrolling up
      scrollToPage(currentPage - 1);
      event.preventDefault();
    }
  }
  
  function scrollToPage(pageIndex: number) {
    if (isScrolling || pageIndex < 0 || pageIndex > rounds.length) return;
    
    isScrolling = true;
    currentPage = pageIndex;
    
    if (scrollContainer) {
      const targetScroll = pageIndex * scrollContainer.clientHeight;
      scrollContainer.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      });
    }
    
    setTimeout(() => {
      isScrolling = false;
    }, 500);
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      playAgain();
    } else if (event.key === 'ArrowDown' && currentPage < rounds.length) {
      scrollToPage(currentPage + 1);
    } else if (event.key === 'ArrowUp' && currentPage > 0) {
      scrollToPage(currentPage - 1);
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
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<div class="game-summary-screen">
  <!-- Static Top Bar -->
  <div class="top-bar">
    {#if !isDailyChallenge}
      <button class="icon-button home-button" onclick={returnHome} title="Return Home">
        🏠
      </button>
    {:else}
      <div></div> <!-- Spacer for daily challenge -->
    {/if}
    
    <button class="icon-button share-button" onclick={shareResults} title="Share Results">
      📤
    </button>
  </div>

  <!-- Scrollable Content Container -->
  <div 
    class="content-container"
    bind:this={scrollContainer}
    onwheel={handleScroll}
  >
    <!-- Page 0: Game Summary -->
    <div class="summary-page">
      <div class="summary-content">
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
            <button class="play-again-button daily" onclick={returnHome}>
              Return Home
            </button>
          {:else}
            <button class="play-again-button" onclick={playAgain} title="Play Again">
              Again
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
    scroll-snap-type: y mandatory;
  }
  
  .summary-page {
    min-height: 100%;
    scroll-snap-align: start;
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
  
  .total-score {
    font-size: 5rem;
    font-weight: 900;
    color: var(--text-accent);
    margin-bottom: 2rem;
    text-shadow: 0 4px 12px rgba(252, 179, 66, 0.4);
    font-variant-numeric: tabular-nums;
    line-height: 1;
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
    background: var(--accent-primary);
    color: var(--bg-primary);
    border: none;
    padding: 1rem 3rem;
    font-size: 1.25rem;
    font-weight: 700;
    border-radius: 25px;
    cursor: pointer;
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    animation: glow 2s ease-in-out infinite;
  }
  
  .play-again-button:hover {
    transform: scale(1.05);
    box-shadow: 0 8px 24px rgba(252, 179, 66, 0.4);
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