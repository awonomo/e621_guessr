<script>
  import ScoreDisplay from "./ScoreDisplay.svelte";
  import TagsList from "./TagsList.svelte";
  import Timer from "./Timer.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let score = 0;
  export let currentPost;
  export let correctGuesses = {};
  export let initialTime = 60;
</script>

<div class="scoreboard left">
  <ScoreDisplay {score} />
  <Timer {initialTime} onTimeUp={() => dispatch("endGame")} />
  <TagsList {currentPost} {correctGuesses} />
  <button class="end" on:click={() => dispatch("endGame")}>End Game</button>
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
