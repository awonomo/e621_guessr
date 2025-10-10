<script lang="ts">
  import { onMount } from 'svelte';
  import { gameActions, currentSession, currentRound, canAdvanceRound } from '../lib/gameStore';
  import type { TagCategory } from '../lib/types';
  import BestTagDisplay from '../components/BestTagDisplay.svelte';
  import RoundBreakdown from '../components/RoundBreakdown.svelte';
  
  let scrollContainer: HTMLElement;
  
  // Calculate round statistics
  $: roundNumber = ($currentSession?.currentRound || 0) + 1;
  $: roundData = $currentRound;
  $: totalTags = roundData?.post?.tags ? Object.values(roundData.post.tags).flat().length : 0;
  $: guessedTags = roundData?.correctGuesses ? Object.values(roundData.correctGuesses).flat().length : 0;
  $: roundScore = roundData?.score || 0;
  $: totalGameScore = $currentSession?.totalScore || 0;
  
  // Find best scoring tag
  $: bestTag = findBestScoringTag();
  
  // Check if there are any tags to show in breakdown
  $: hasTagsToShow = $currentRound?.post?.tags && Object.values($currentRound.post.tags).flat().length > 0;
  
  function findBestScoringTag() {
    if (!roundData?.correctGuesses) return null;
    
    let bestTag = null;
    let bestPoints = 0;
    
    Object.entries(roundData.correctGuesses).forEach(([category, tagEntries]) => {
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
    
    return bestTag;
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      nextRound();
    }
  }
  
  function nextRound() {
    gameActions.nextRound();
  }
  
  function quitGame() {
    if (confirm('Are you sure you want to quit? Your progress will be lost.')) {
      gameActions.resetGame();
    }
  }
  
  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<div class="round-summary-screen">
  <!-- Static Top Bar -->
  <div class="top-bar">
    <button class="icon-button quit-button" on:click={quitGame} title="Quit Game">
      ✕
    </button>

    <h1 class="round-title">ROUND {roundNumber}</h1>

    <button 
      class="icon-button next-button glowing" 
      on:click={nextRound} 
      title="Next Round"
    >
      {#if $canAdvanceRound}
        ➔
      {:else}
        ➔
      {/if}
    </button>
  </div>

  <!-- Static Round Header -->
  <!-- <div class="round-header">
    <h1 class="round-title">ROUND {roundNumber}</h1>
  </div> -->

  <!-- Scrollable Content Container -->
  <div 
    class="content-container"
    bind:this={scrollContainer}
  >
    <!-- Page 1: Round Summary -->
    <div class="summary-page">
      <div class="summary-content">
        <div class="tags-count">{guessedTags}/{totalTags}</div>
        
        <div class="round-score">{roundScore.toLocaleString()}</div>
        
        {#if bestTag}
          <BestTagDisplay 
            tag={bestTag.tag}
            category={bestTag.category}
            points={bestTag.points}
          />
        {/if}
        
        <div class="total-score">
          <span class="label">total:</span>
          <span class="score">{totalGameScore.toLocaleString()}</span>
        </div>
        
        <div class="scroll-prompt" class:visible={hasTagsToShow}>
          <span>tag breakdown</span>
          <div class="arrow">⌄</div>
        </div>
      </div>
    </div>

    <!-- Page 2: Round Tags Breakdown -->
    <div class="breakdown-page">
      <RoundBreakdown roundData={$currentRound} roundNumber={roundNumber} />
    </div>
  </div>
</div>

<style>
  .round-summary-screen {
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
  
  .round-title {
    font-size: 3rem;
    font-weight: 900;
    color: var(--text-accent);
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    text-shadow: 0 2px 8px rgba(252, 179, 66, 0.3);
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
    background: var(--bg-light);
    color: var(--bg-primary);
    transform: scale(1.05);
  }
  
  .next-button.glowing {
    animation: glow 2s ease-in-out infinite;
    box-shadow: 0 0 20px rgba(252, 179, 66, 0.5);
  }
  
  /* Scrollable Content */
  .content-container {
    margin-top: 8rem;
    height: calc(100vh - 8rem);
    overflow-y: auto;
    scroll-behavior: smooth;
  }
  
  .summary-page, .breakdown-page {
    min-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }
  
  .breakdown-page {
    padding: 0; /* Let RoundBreakdown handle its own padding */
  }
  
  /* Summary Content */
  .summary-content {
    text-align: center;
    max-width: 600px;
    width: 100%;
  }
  
  .tags-count {
    font-size: 1.5rem;
    color: var(--text-secondary);
    font-weight: 600;
  }
  
  .round-score {
    font-size: 8rem;
    font-weight: 900;
    color: var(--text-accent);
    margin-bottom: 2rem;
    text-shadow: 0 2px 8px rgba(252, 179, 66, 0.3);
    font-variant-numeric: tabular-nums;
  }
  
  .total-score {
    font-size: 2rem;
    margin-bottom: 4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }
  
  .total-score .label {
    color: var(--text-secondary);
  }
  
  .total-score .score {
    color: var(--text-primary);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
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
      box-shadow: 0 0 20px rgba(252, 179, 66, 0.5);
    }
    50% {
      box-shadow: 0 0 30px rgba(252, 179, 66, 0.8);
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
    .round-title {
      font-size: 2rem;
    }
    
    .round-score {
      font-size: 6rem;
    }
    
    .total-score {
      font-size: 1.5rem;
      flex-direction: column;
      gap: 0.5rem;
    }
    

  }
</style>