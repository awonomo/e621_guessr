<script>
  import GameSetup from "./GameSetup.svelte";
  import GameScreen from "./GameScreen.svelte";

  // Initial game state
  const initialGameState = {
    totalRounds: 5,
    currentRound: 0,
    roundActive: false,
    score: 0,
    timeLimit: 120,
    timeLeft: 120,
    posts: [],
    guessStatus: null,
    correctGuesses: {}
};

// Current game state
let gameState = { ...initialGameState };
let showGameScreen = false; // boolean that controls UI flow between setup and game screen

  //receives settings from GameSetup in event, merges them with gameState object
  function gameStart(event) {
    gameState = {
      ...gameState,
      ...event.detail,
      posts: event.detail.post.posts
    };
    showGameScreen = true;
  }

  // Reset game to initial state
  function gameReset() {
    gameState = { ...initialGameState };
    showGameScreen = false;
  }

$: if (gameState.timeLeft) console.log('Time left:', gameState.timeLeft);

function nextRound() {
    if (gameState.currentRound < gameState.totalRounds - 1) {
      gameState.currentRound += 1;
      // gameState.roundActive = false;     
      gameState.timeLeft = gameState.timeLimit;
      gameState.score = 0;
      gameState.correctGuesses = {};
    } else {
      gameReset();
    }
    console.log('Next Round!');
  }

</script>

<main>
  {#if !showGameScreen}
    <GameSetup on:start={gameStart} />
  {:else}
    <GameScreen {gameState} nextRound={nextRound} />
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
