<script>
  import { createEventDispatcher } from "svelte";
  import PostViewer from "./components/PostViewer.svelte";
  import GuessInput from "./components/GuessInput.svelte";
  import Scoreboard from "./components/Scoreboard.svelte";
  import CountdownOverlay from './components/CountdownOverlay.svelte';
  export let gameState;
  export let nextRound = () => {};
  const dispatch = createEventDispatcher();

  let timeLeft = gameState.timeLimit;
  $: currentPost = (gameState.posts && gameState.posts.length > 0 && gameState.posts[gameState.currentRound] !== undefined) ? gameState.posts[gameState.currentRound] : null;
  $: if (currentPost) console.log('CurrentPost updated:', currentPost);
  let clearInput = false;
  
  let showCountdown = true;

// $: if (typeof gameState.currentRound === 'number') {
//   timeLeft = gameState.timeLimit;
//   // reset guesses, status, etc.
// }

function countdownFinish() {
  showCountdown = false;
  gameState.roundActive = true;
  // Optionally start timer or enable input here
}

  function handleGuess({ detail }) {
    const guess = detail.guess.trim().toLowerCase();
    if (!guess) return;

    let found = false;
    const updated = { ...gameState.correctGuesses };

    Object.entries(currentPost.tags).forEach(([category, tagList]) => {
      tagList.forEach((tag) => {
        if (tag.toLowerCase() === guess) {
          found = true;
          updated[category] = updated[category] || [];
          if (!updated[category].includes(guess)) updated[category].push(guess);
        }
      });
    });

     if (found) {
    gameState.score += 125;
    gameState.correctGuesses = updated;
    clearInput = true;
    gameState.guessStatus = 'correct';
    setTimeout(() => { clearInput = false; gameState.guessStatus = ''; }, 800);
  } else {
    gameState.guessStatus = 'incorrect';
    setTimeout(() => { gameState.guessStatus = ''; }, 800);
  }
  }
  
</script>

<div class="game-screen">
  <header class="logo-header">
    <h1>e6_tag_challenge</h1>
    <span>by awonomo and birch</span>
  </header>

  <main>
    <PostViewer {currentPost} />
    <GuessInput on:guess={handleGuess} clearInput={clearInput} guessStatus={gameState.guessStatus} />
    <Scoreboard
      {gameState}
      on:nextRound={nextRound}
      {currentPost}
    />
  </main>
    {#if showCountdown}
    <CountdownOverlay onFinish={countdownFinish} />
  {/if}
</div>

<style>
  .game-screen {
    min-height: 100vh;
    background: #021123;
    color: white;
    padding-bottom: 120px;
  }
  main {
    display: flex;
    gap: 20px;
    padding: 1rem;
  }

  .logo-header {
    text-align: left;
    margin: 1rem;
  }
</style>
