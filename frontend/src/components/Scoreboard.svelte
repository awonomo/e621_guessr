<script>
  export let gameState;
  export let currentPost;
  import ScoreDisplay from "./ScoreDisplay.svelte";
  import TagsList from "./TagsList.svelte";
  import Timer from "./Timer.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
</script>

<div class="scoreboard">
  <ScoreDisplay score={gameState.score} />
  <Timer roundKey={gameState.currentRound} roundActive={gameState.roundActive} initialTime={gameState.timeLimit} onTimeUp={() => dispatch("nextRound")} />
  <TagsList currentPost={currentPost} correctGuesses={gameState.correctGuesses} />
  <span>Round {gameState.currentRound + 1} / {gameState.totalRounds}</span>
  <button class="end" on:click={() => dispatch("nextRound")}>Skip</button>
</div>

<style>
  .scoreboard {
    width: 260px;
    background: rgb(41, 38, 61);
    padding: 12px;
    margin-right: 3vw;
    border-radius: 8px;
  }
  button {
    padding: 12px 18px;
    border-radius: 8px;
    border: none;
    background: #fcb342;
    color: #000;
    font-weight: 600;
  }
</style>
