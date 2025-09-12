<script>
  import GameSetup from "./GameSetup.svelte";
  import GameScreen from "./GameScreen.svelte";

  let gameConfig = null;

  // Start game handler: receives config from GameSetup
  function handleStart(event) {
    gameConfig = event.detail; // contains timeLimit, post, ratings, etc.
  }

  // Reset game handler: triggered from GameScreen
  function handleReset() {
    gameConfig = null;
  }
</script>

<main>
  {#if !gameConfig}
    <GameSetup on:start={handleStart} />
  {:else}
    <GameScreen {gameConfig} on:reset={handleReset} />
  {/if}
</main>

<style>
  main {
    font-family: sans-serif;
    background-color: #021123;
    color: white;
    min-height: 100vh;
  }
</style>
