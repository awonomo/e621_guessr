<script>
  import { onMount } from "svelte";
  export let initialTime = 60;
  export let onTimeUp = () => {};

  let timeLeft = initialTime;
  let interval;

  onMount(() => {
    interval = setInterval(() => {
      timeLeft = Math.max(0, timeLeft - 1);
      if (timeLeft === 0) {
        clearInterval(interval);
        onTimeUp();
      }
    }, 1000);
    return () => clearInterval(interval);
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
