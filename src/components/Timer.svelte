<script lang="ts">
  import { useInterval } from 'runed';
  import { currentSession, gameActions, currentState, currentRound, isPaused } from '../lib/gameStore';
  
  interface Props {
    onTimeUp: () => void;
    ontogglePause?: () => void;
  }
  
  let { onTimeUp, ontogglePause }: Props = $props();
  
  let localTimeRemaining = $state(0);
  let previousState: string | undefined;
  
  // Initialize local time when round changes
  $effect(() => {
    if ($currentRound?.timeRemaining !== undefined) {
      localTimeRemaining = $currentRound.timeRemaining;
    }
  });
  
  // Check if we're in warning zone (last 10 seconds)
  let isWarningZone = $derived(localTimeRemaining <= 10 && localTimeRemaining > 0);
  
  // Start pulse animation in warning zone
  let pulseAnimation = $derived(isWarningZone);
  
  // Watch for state transitions to roundSummary (timer expired)
  $effect(() => {
    if (previousState === 'playing' && $currentState === 'roundSummary') {
      onTimeUp();
    }
    previousState = $currentState;
  });
  
  // Create interval that only runs when game is playing and not paused
  const timerInterval = useInterval(() => {
    console.log('[Timer] Tick - current time:', localTimeRemaining, 'paused:', $isPaused, 'state:', $currentState);
    
    if (localTimeRemaining > 0) {
      localTimeRemaining--;
      // Update the game store with the new time
      gameActions.updateTimeRemaining(localTimeRemaining);
    }
  }, 1000, { immediate: false });
  
  // Control the interval based on game state and pause
  $effect(() => {
    const shouldRun = $currentState === 'playing' && !$isPaused && localTimeRemaining > 0;
    console.log('[Timer] Should run:', shouldRun, 'state:', $currentState, 'paused:', $isPaused, 'time:', localTimeRemaining);
    
    if (shouldRun) {
      timerInterval.resume();
    } else {
      timerInterval.pause();
    }
  });

  function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
  
  function togglePause() {
    ontogglePause?.();
  }
</script>

<div class="timer-container">
  <div 
    class="timer-display"
    class:warning={isWarningZone}
    class:pulse={pulseAnimation}
  >
    <div class="time-text">
      {formatTime(localTimeRemaining)}
    </div>
    
    <button 
      class="pause-button"
      onclick={togglePause}
      title={!$isPaused ? 'Pause Game' : 'Resume Game'}
    >
      {#if !$isPaused}
        <!-- Pause icon -->
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
        </svg>
      {:else}
        <!-- Play icon -->
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7L8 5z"/>
        </svg>
      {/if}
    </button>
  </div>
  
  <div class="timer-progress">
    <div 
      class="progress-bar"
      style="width: {(localTimeRemaining / ($currentSession?.settings.timeLimit || 60)) * 100}%"
      class:warning={isWarningZone}
    ></div>
  </div>
</div>

<style>
  .timer-container {
    position: relative;
    width: 100%;
  }
  
  .timer-display {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: linear-gradient(145deg, 
      var(--bg-secondary) 0%, 
      var(--bg-primary) 100%);
    border-radius: 8px 8px 0 0;
    border: 2px solid transparent;
    position: relative;
    
    /* Upside-down trapezoid shape */
    clip-path: polygon(
      10% 0%, 
      90% 0%, 
      100% 100%, 
      0% 100%
    );
    
    transition: all 0.3s ease;
  }
  
  .timer-display::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(145deg, 
      var(--accent-primary), 
      var(--accent-secondary));
    border-radius: inherit;
    z-index: -1;
    opacity: 0;
    transition: opacity 0.3s ease;
    
    /* Match the trapezoid clip path */
    clip-path: polygon(
      10% 0%, 
      90% 0%, 
      100% 100%, 
      0% 100%
    );
  }
  
  .timer-display.warning {
    border-color: #ff4444;
    box-shadow: 0 0 20px rgba(255, 68, 68, 0.4);
  }
  
  .timer-display.warning::before {
    background: linear-gradient(145deg, #ff4444, #cc0000);
    opacity: 1;
  }
  
  .timer-display.pulse {
    animation: pulse 1s ease-in-out infinite;
  }
  
  .time-text {
    font-size: 1.875rem;
    font-weight: 700;
    font-family: 'Courier New', monospace;
    color: var(--text-primary);
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    letter-spacing: 0.1em;
  }
  
  .timer-display.warning .time-text {
    color: #ff6666;
    text-shadow: 0 0 10px rgba(255, 68, 68, 0.8);
  }
  
  .pause-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    background: var(--bg-primary);
    border: 2px solid var(--accent-primary);
    border-radius: 50%;
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0; /* Prevent shrinking */
  }
  
  .pause-button:hover {
    background: var(--accent-primary);
    color: var(--bg-primary);
    transform: scale(1.05);
  }
  
  .pause-button:active {
    transform: scale(0.95);
  }
  
  .timer-progress {
    height: 4px;
    background: var(--bg-primary);
    border-radius: 0 0 4px 4px;
    overflow: hidden;
    margin-top: -1px;
  }
  
  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, 
      var(--accent-primary), 
      var(--accent-secondary));
    transition: width 1s linear;
    border-radius: inherit;
  }
  
  .progress-bar.warning {
    background: linear-gradient(90deg, #ff4444, #cc0000);
    box-shadow: 0 0 10px rgba(255, 68, 68, 0.6);
  }
  
  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      box-shadow: 0 0 20px rgba(255, 68, 68, 0.4);
    }
    50% {
      transform: scale(1.02);
      box-shadow: 0 0 30px rgba(255, 68, 68, 0.8);
    }
  }
  
  /* Mobile responsiveness */
  @media (max-width: 768px) {
    .timer-display {
      padding: 0.5rem 0.75rem;
      clip-path: polygon(5% 0%, 95% 0%, 100% 100%, 0% 100%);
    }
    
    .timer-display::before {
      clip-path: polygon(5% 0%, 95% 0%, 100% 100%, 0% 100%);
    }
    
    .time-text {
      font-size: 1.25rem;
    }
    
    .pause-button {
      width: 2rem;
      height: 2rem;
    }
  }
</style>