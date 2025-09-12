<script>
  import { onMount, createEventDispatcher } from 'svelte';
  export let gameConfig;
  const dispatch = createEventDispatcher();

  let score = 0;
  let timeLeft = gameConfig.timeLimit;
  let currentPost = gameConfig.post;
  let guess = '';
  let correctGuesses = {};
  let guessInput;

  const tagColors = {
    general: "#b4c7d9",
    artist: "#f2ac08",
    contributor: "silver",
    copyright: "#d0d",
    character: "#0a0",
    species: "#ed5d1f",
    meta: "#fff",
    lore: "#282",
    invalid: "#ff3d3d",
  };

  onMount(() => {
    if (guessInput) guessInput.focus();

    const timer = setInterval(() => {
      timeLeft = Math.max(0, timeLeft - 1);
    }, 1000);

    return () => clearInterval(timer);
  });

  $: totalTags = Object.keys(currentPost.tags).reduce((sum,k) => sum + currentPost.tags[k].length, 0);

  function handleInput(e) {
    guess = e.target.value.replace(/\s+/g, "_");
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitGuess();
    }
  }

  function submitGuess() {
    const normalized = guess.trim().toLowerCase();
    if (!normalized) return;

    let found = false;
    const updated = { ...correctGuesses };

    for (const [category, tagList] of Object.entries(currentPost.tags)) {
      for (const tag of tagList) {
        if (tag.toLowerCase() === normalized) {
          found = true;
          if (!updated[category]) updated[category] = [];
          if (!updated[category].includes(normalized)) updated[category].push(normalized);
        }
      }
    }

    if (found) {
      score += 125;
      correctGuesses = updated;
      guess = '';
      if (guessInput) guessInput.focus();
    }
  }

  function endGame() {
    dispatch('reset');
  }
</script>

<div class="game-screen">
  <header>
    <h1>e6_tag_challenge</h1>
  </header>

  <main>
    <aside class="left">
      <div class="score">{score}</div>
      <div class="timer">{Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</div>
      <div class="total-tags"><strong>Total Tags:</strong> {totalTags}</div>

      <div class="tags-list">
        <strong>Tags:</strong>
        {#if Object.keys(correctGuesses).length === 0}
          <div>None yet</div>
        {/if}
        {#each Object.entries(correctGuesses) as [category, guesses]}
          <div class="tag-row">
            <strong>{category}:</strong>
            {#each guesses as t}
              <span class="tag" style="color: {tagColors[category] ?? tagColors.invalid};">{t}</span>
            {/each}
          </div>
        {/each}
      </div>

      <button class="end" on:click={endGame}>End Game</button>
    </aside>

    <section class="right">
      <img src={currentPost.sample?.url || currentPost.file.url} alt={`Post ${currentPost.id}`} />
    </section>
  </main>

  <div class="floating-bar">
    <input
      bind:this={guessInput}
      type="text"
      bind:value={guess}
      on:input={handleInput}
      on:keydown={handleKeyDown}
      placeholder="Enter guess (spaces -> underscores)"
      autocomplete="off"
      spellcheck="false"
    />
    <button on:click={submitGuess}>Submit</button>
  </div>
</div>

<style>
  .game-screen { min-height: 100vh; background: #021123; color: white; padding-bottom: 120px; }
  main { display:flex; gap: 20px; padding: 1rem; }
  .left { width: 260px; background: rgb(41,38,61); padding: 12px; border-radius:8px; }
  .score { font-size: 3rem; font-weight:700; }
  .timer { font-size: 2rem; margin-top: 8px; }
  .right img { max-width:100%; border-radius:8px; }
  .floating-bar { position: fixed; bottom: 12px; left: 0; width: 100%; display:flex; justify-content:center; z-index:1000; }
  .floating-bar > * { width: min(900px, 95%); display:flex; gap:8px; }
  input { flex:1; padding:12px; border-radius:8px; border:1px solid #555; background:#fff; color:#000; }
  button { padding:12px 18px; border-radius:8px; border:none; background:#fcb342; color:#000; font-weight:600; }
  .tag { margin-right: 6px; display:inline-block; }
</style>