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
  import "../styles/summary-screen.css";

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

<div class="round-summary-screen summary-screen-base">
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
  /* RoundSummaryScreen-specific styles only */
  
  /* Next button and label in top bar */
  .next {
    padding-right: 2rem;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .next {
      display: none;
    }

    .flex-spacer {
      display: none;
    }
  }
</style>
