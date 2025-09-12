<script>
  import { createEventDispatcher } from "svelte";
  import PostViewer from "./components/PostViewer.svelte";
  import GuessInput from "./components/GuessInput.svelte";
  import Scoreboard from "./components/Scoreboard.svelte";

  export let gameConfig;
  const dispatch = createEventDispatcher();

  let timeLeft = gameConfig.timeLimit;
  let currentPost = gameConfig.post;
  let correctGuesses = {};
  let guessStatus = null;
  let score = 0;
  let clearInput = false;

  function handleGuess({ detail }) {
    const guess = detail.guess.trim().toLowerCase();
    if (!guess) return;

    let found = false;
    const updated = { ...correctGuesses };

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
    score += 125;
    correctGuesses = updated;
    clearInput = true;
    guessStatus = 'correct';
    setTimeout(() => { clearInput = false; guessStatus = ''; }, 800);
  } else {
    guessStatus = 'incorrect';
    setTimeout(() => { guessStatus = ''; }, 800);
  }
}

  function endGame() {
    dispatch("reset");
  }
</script>

<div class="game-screen">
  <header class="logo-header">
    <h1>e6_tag_challenge</h1>
    <span>by awonomo and birch</span>
  </header>

  <main>
    <PostViewer {currentPost} />
      <GuessInput on:guess={handleGuess} {clearInput} {guessStatus} />
    <Scoreboard
      {score}
      initialTime={gameConfig.timeLimit}
      on:endGame={endGame}
      {currentPost}
      {correctGuesses}
    />
  </main>
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
