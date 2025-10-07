<script lang="ts">
  import { gameActions } from '../lib/gameStore';
  import { onMount } from 'svelte';

  let countdown = 3; // Start at 3 instead of 4
  let message = "6";

  onMount(() => {
    const messages = ["6", "2", "1", "GO!"];
    let messageIndex = 0;
    
    // Start preloading immediately when countdown begins
    gameActions.preloadCurrentRoundImage();
    
    // Set first message immediately
    message = messages[messageIndex];
    
    const interval = setInterval(async () => {
      messageIndex += 1;
      
      if (messageIndex < messages.length) {
        message = messages[messageIndex];
      } else {
        clearInterval(interval);
        await gameActions.startRound();
      }
    }, 800);

    return () => clearInterval(interval);
  });
</script>

<div class="countdown-screen">
  <div class="countdown-container">
    <h1 class="countdown-message">{message}</h1>
  </div>
</div>

<style>
  .countdown-screen {
    position: fixed;
    inset: 0;
    background: linear-gradient(135deg, var(--bg-primary) 0%, #0f1a2e 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  }

  .countdown-container {
    text-align: center;
  }

  .countdown-message {
    font-size: 8rem;
    font-weight: 900;
    color: var(--text-accent);
    margin: 0;
    text-shadow: 
      0 0 20px rgba(252, 179, 66, 0.5),
      0 0 40px rgba(252, 179, 66, 0.3),
      0 4px 8px rgba(0, 0, 0, 0.3);
    animation: pulse 0.8s ease-in-out;
  }

  @keyframes pulse {
    0% { 
      transform: scale(0.5);
      opacity: 0;
    }
    60% { 
      transform: scale(1.1);
      opacity: 1;
    }
    100% { 
      transform: scale(1);
      opacity: 1;
    }
  }

  @media (max-width: 768px) {
    .countdown-message {
      font-size: 6rem;
    }
  }
</style>