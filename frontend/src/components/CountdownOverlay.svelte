<script>
  import { onMount } from 'svelte';
  export let onFinish = () => {};

  let countdown = 3;
  let message = countdown.toString();

  onMount(() => {
    const interval = setInterval(() => {
      countdown -= 1;
      if (countdown > 0) {
        message = countdown.toString();
      } else if (countdown === 0) {
        message = "Go!";
      } else {
        clearInterval(interval);
        onFinish();
      }
    }, 800);
    return () => clearInterval(interval);
  });
</script>

{#if countdown >= 0}
  <div class="countdown-overlay">
    <span>{message}</span>
  </div>
{/if}

<style>
  .countdown-overlay {
    position: fixed;
    inset: 0;
    background: rgba(2, 17, 35, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  }
  .countdown-overlay span {
    font-size: 6rem;
    font-weight: bold;
    color: #fcb342;
    text-shadow: 0 2px 24px #000;
    animation: pop 0.8s;
  }
  @keyframes pop {
    0% { transform: scale(0.5); opacity: 0.5; }
    60% { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
</style>