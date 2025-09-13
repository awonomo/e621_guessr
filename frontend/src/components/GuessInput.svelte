<script>
  import { createEventDispatcher, onMount } from "svelte";
  export let clearInput = false;
  export let guessStatus = null;

  $: if (clearInput) {
    guess = "";
    if (guessInput) guessInput.focus();
  }
  const dispatch = createEventDispatcher();

  let guess = "";
  let guessInput;

  onMount(() => {
    if (guessInput) guessInput.focus();
  });

  function handleInput(e) {
    guess = e.target.value.replace(/\s+/g, "_");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      submitGuess();
    }
  }

  function submitGuess() {
    dispatch("guess", { guess });
    if (guessInput) guessInput.focus();
  }
</script>

<div class="guess-input-bar"
  class:correct={guessStatus === 'correct'}
  class:incorrect={guessStatus === 'incorrect'}>
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
  <button on:click={submitGuess}>?</button>
</div>

<style>

  .guess-input-bar {
    position: fixed;
    bottom: 1rem;
    left: 42%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 600px;
    display: flex;
    justify-content: center;
    z-index: 1000;
    /* background-color: #232a3a;
    padding: 10px 10px; */
    border-radius: 16px;
    box-shadow: 0 2px 16px rgba(0,0,0,0.15);
    border: 10px solid #232a3a;;
  transition: border-color 0.4s, background-color 0.4s;
  }
  .guess-input-bar > * {
    width: 100%;
    display: flex;
    gap: 32px;
  }
  .guess-input-bar.correct {
  border-color: #2ecc40;
}
.guess-input-bar.incorrect {
  border-color: #ff4136;
}
    input {
      flex: 1;
      border-top-left-radius: 8px;
      border-bottom-left-radius: 8px;
      border: 1px solid #555;
      background: #eee;
      color: #000;
      font-size: 1.25rem;
      padding-left: 24px;
      outline: none;
      box-shadow: none;
      border: 1px solid #fcb342;
    }
    input:focus {
      outline: none;
      box-shadow: none;
      border: 1px solid #fcb342;
    }
    input::placeholder {
      font-size: 1.15rem;
      color: #888;
      opacity: 1;
  }

  button {
    max-width: 100px;
    padding: 12px 18px;
    border-top-left-radius: 0px;
    border-bottom-left-radius: 0px;
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
    border: none;
    background: #fcb342;
    color: #000;
    font-size: 2rem;
    font-weight: 600;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    }
</style>
