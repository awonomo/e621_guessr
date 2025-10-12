<script lang="ts">
  import { onMount } from "svelte";
  import {
    gameActions,
    currentSession,
    currentRound,
    canAdvanceRound,
  } from "../lib/gameStore";
  import type { TagCategory } from "../lib/types";
  import BestTagDisplay from "../components/BestTagDisplay.svelte";
  import RoundBreakdown from "../components/RoundBreakdown.svelte";

  // Calculate round statistics
  $: roundNumber = ($currentSession?.currentRound || 0) + 1;
  $: roundData = $currentRound;
  $: totalTags = roundData?.post?.tags
    ? Object.values(roundData.post.tags).flat().length
    : 0;
  $: guessedTags = roundData?.correctGuesses
    ? Object.values(roundData.correctGuesses).flat().length
    : 0;
  $: roundScore = roundData?.score || 0;
  $: totalGameScore = $currentSession?.totalScore || 0;

  // Find best scoring tag
  $: bestTag = findBestScoringTag();

  // Check if there are any tags to show in breakdown
  $: hasTagsToShow =
    $currentRound?.post?.tags &&
    Object.values($currentRound.post.tags).flat().length > 0;

  function findBestScoringTag() {
    if (!roundData?.correctGuesses) return null;

    let bestTag = null;
    let bestPoints = 0;

    Object.entries(roundData.correctGuesses).forEach(
      ([category, tagEntries]) => {
        if (tagEntries) {
          tagEntries.forEach((tagEntry) => {
            // Use the pre-calculated score from the backend
            if (tagEntry.score > bestPoints) {
              bestPoints = tagEntry.score;
              bestTag = {
                tag: tagEntry.tag,
                category: category as TagCategory,
                points: tagEntry.score,
              };
            }
          });
        }
      }
    );

    return bestTag;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      nextRound();
    }
  }

  function nextRound() {
    gameActions.nextRound();
  }

  function quitGame() {
    if (confirm("Are you sure you want to quit? Your progress will be lost.")) {
      gameActions.resetGame();
    }
  }

  onMount(() => {
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  });
</script>

<div class="round-summary-screen">
  <!-- Static Top Bar -->
  <div class="top-bar">
    <button
      class="icon-button quit-button"
      on:click={quitGame}
      title="Quit Game"
    >
      ✕
    </button>

    <h1 class="logo-header">e621_guessr</h1>
    <div class="flex-spacer" style="flex:1"></div>
    <h1 class="round-title next">next</h1>
    <button
      class="icon-button next-button"
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

  <!-- Page 1: Round Summary -->
  <div class="summary-page">
    <div class="summary-content">
      <h1 class="round-title">ROUND {roundNumber}:</h1>
      <div class="score-heading glowing">{roundScore.toLocaleString()}</div>
      {#if bestTag}
        <BestTagDisplay
          tag={bestTag.tag}
          category={bestTag.category}
          points={bestTag.points}
        />
      {/if}
      <div class="total-score">
        <span class="label">game:</span>
        <span class="score">{totalGameScore.toLocaleString()}</span><span
          class="pts">pts.</span
        >
      </div>
      <div class="scroll-prompt" class:visible={hasTagsToShow}>
        <span>{guessedTags}/{totalTags} tags guessed</span>
        <div class="arrow">⌄</div>
      </div>
    </div>
  </div>

  <!-- Page 2: Round Tags Breakdown -->
  <div class="breakdown-page">
    <RoundBreakdown roundData={$currentRound} {roundNumber} />
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
    z-index: 100;
    flex-shrink: 0;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: var(--bg-primary);
    border-bottom: 1px solid var(--bg-secondary);
  }

  .logo-header {
    padding-left: 3rem;
    text-align: left;
    margin: 0;
  }

  .round-title {
    font-size: 2rem;
    font-weight: 900;
    color: var(--text-secondary);
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .next {
    padding-right: 2rem;
  }

  .score-heading.glowing {
    animation: glow 2s ease-in-out infinite;
    text-shadow: 0 0 20px rgba(252, 179, 66, 0.5);
  }

  .summary-page {
    min-height: calc(100vh - 6rem);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    width: 100%;
    background: var(--bg-primary);
    z-index: 1;
    position: absolute;
    top: 6rem;
    left: 0;
    right: 0;
    bottom: 0;
  }

  .breakdown-page {
    border-top: 2px dotted var(--bg-secondary);
    min-height: calc(100vh - 6rem);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    width: 100%;
    background: var(--bg-primary);
    z-index: 0;
    position: absolute;
    top: 100vh;
    left: 0;
    right: 0;
    min-height: calc(100vh - 6rem);
    padding-top: 5rem;
    padding-bottom: 8rem;
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

  .total-score {
    font-size: 2rem;
    margin-bottom: 2rem;
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 0.25rem;
  }

  .score {
    color: var(--text-primary);
    font-weight: 700;
    margin-right: 0.1em;
    padding-right: 0;
  }
  .pts {
    font-weight: 400;
    color: var(--text-secondary);
    margin-left: 00em;
  }

  .total-score .label {
    color: var(--text-secondary);
  }

  .total-score .score {
    padding-left: 0.75rem;
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
    animation: bounce 2s;
  }

  /* Animations */
  @keyframes glow {
    0%,
    100% {
      text-shadow: 0 0 20px rgba(252, 179, 66, 0.1);
    }
    50% {
      text-shadow: 0 0 30px rgba(252, 179, 66, 0.3);
    }
  }

  @keyframes bounce {
    0%,
    20%,
    50%,
    80%,
    100% {
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

    .next {
      display: none;
    }

    .flex-spacer {
      display: none;
    }

    .logo-header {
      padding-left: 0;
    }

    .score-heading {
      font-size: 6rem;
    }

    .total-score {
      font-size: 1rem;
    }
  }
</style>
