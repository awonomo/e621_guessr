<script>
  import { onMount } from "svelte";
  export let roundActive = false;
  export let initialTime = 60;
  export let onTimeUp = () => {};
  export let roundKey;

  let timeLeft = initialTime;
  let interval;

    $: if (roundKey !== undefined) {
    timeLeft = initialTime;
  }

  $: if (roundActive) {
    if (interval) clearInterval(interval);
    interval = setInterval(() => {
      if (timeLeft > 0) {
        timeLeft -= 1;
      } else {
        clearInterval(interval);
        onTimeUp();
      }
    }, 1000);
  } else {
    if (interval) clearInterval(interval);
  }

  // Clean up interval on destroy
  onMount(() => {
    return () => {
      if (interval) clearInterval(interval);
    };
  });
</script>

<div class="timer">
  {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
</div>

<style>
  .timer {
    font-size: 2rem;
    margin-top: 8px;
  }
</style>
