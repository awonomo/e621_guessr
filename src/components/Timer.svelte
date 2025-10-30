<script lang="ts">
  import { currentSession, gameActions, currentState, currentRound, isPaused } from '../lib/gameStore';
  
  interface Props {
    onTimeUp: () => void;
    ontogglePause?: () => void;
    onSkip?: () => void;
    variant?: 'desktop' | 'mobile';
  }
  
  let { onTimeUp, ontogglePause, onSkip, variant = 'desktop' }: Props = $props();
  
  let localTimeRemaining = $state(0);
  let previousState: string | undefined;
  
  // Check if current game is untimed
  let isUntimedMode = $derived($currentSession?.settings.timeLimit === -1);
  
  // Calculate pauses remaining
  let pausesRemaining = $derived(3 - ($currentRound?.pauseCount || 0));
  let pauseLimitReached = $derived(pausesRemaining <= 0);
  
  // Show skip button only when pauses exhausted AND game is not currently paused
  let showSkipButton = $derived(pauseLimitReached && !$isPaused);
  
  // Initialize local time when round changes
  $effect(() => {
    if ($currentRound?.timeRemaining !== undefined) {
      localTimeRemaining = $currentRound.timeRemaining;
    }
  });
  
  // Check if we're in warning zone (last 10 seconds) - but not in untimed mode
  let isWarningZone = $derived(!isUntimedMode && localTimeRemaining <= 10 && localTimeRemaining > 0);
  
  // Start pulse animation in warning zone
  let pulseAnimation = $derived(isWarningZone);
  
  // Watch for state transitions to roundSummary (timer expired)
  $effect(() => {
    if (previousState === 'playing' && $currentState === 'roundSummary') {
      onTimeUp();
    }
    previousState = $currentState;
  });
  
  // Timer should only run when actively playing and not paused
  let timerId: number | undefined;
  
  $effect(() => {
    // Clear any existing timer
    if (timerId) {
      clearInterval(timerId);
      timerId = undefined;
    }
    
    // Start timer only when all conditions are met (and not in untimed mode)
    const shouldRunTimer = 
      $currentState === 'playing' && 
      !$isPaused && 
      localTimeRemaining > 0 &&
      !isUntimedMode;  // Don't run timer in untimed mode
    
    if (shouldRunTimer) {
      timerId = setInterval(() => {
        localTimeRemaining--;
        gameActions.updateTimeRemaining(localTimeRemaining);
      }, 1000);
    }
    
    // Cleanup function
    return () => {
      if (timerId) {
        clearInterval(timerId);
        timerId = undefined;
      }
    };
  });

  function formatTime(seconds: number): string {
    // Handle Infinity or untimed mode (check both -1 and Infinity)
    if (!isFinite(seconds) || seconds === -1 || isUntimedMode) {
      return '∞';
    }
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
  
  function handleButtonClick() {
    if (showSkipButton && onSkip) {
      // When pauses are exhausted AND game is unpaused, skip the round
      onSkip();
    } else {
      // Otherwise, toggle pause
      ontogglePause?.();
    }
  }
</script>

<div class="timer-container {variant}">
  <div 
    class="timer-display {variant}"
    class:warning={isWarningZone}
    class:pulse={pulseAnimation}
  >
    <div class="time-text {variant}">
      {formatTime(localTimeRemaining)}
    </div>
    
    <button 
      class="pause-button {variant}"
      onclick={handleButtonClick}
      title={showSkipButton ? 'Skip Round' : (!$isPaused ? 'Pause Game' : 'Resume Game')}
    >
      {#if showSkipButton}
        <!-- Skip icon when no pauses remaining AND unpaused - U+FE0E forces text presentation -->
        <span class="no-emoji">⏭︎</span>
      {:else if !$isPaused}
        <!-- Pause icon - U+FE0E forces text presentation -->
        <span class="no-emoji">⏯︎</span>
      {:else}
        <!-- Play icon - U+FE0E forces text presentation -->
        <span class="no-emoji">⏯︎</span>
      {/if}
    </button>
  </div>
</div>

<style>
  /* Prevent emoji transformation - use system fonts without emoji support */
  .no-emoji {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
    font-variant-emoji: text !important;
    display: inline-block;
  }
  
  /* Override emoji rendering at button level */
  .pause-button {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-feature-settings: "liga" 0, "calt" 0;
    -webkit-font-feature-settings: "liga" 0, "calt" 0;
  }
  
  .pause-button span {
    font-style: normal !important;
    font-weight: normal !important;
    text-rendering: optimizeLegibility;
    display: inline-block;
    transform: translateZ(0);
    -webkit-transform: translateZ(0);
  }
  
  .timer-container {
    position: relative;
    width: 100%;
    margin: 0.5rem;
  }
  
  .timer-container.mobile .timer-display {
    background: transparent;
    border: none;
    margin: 0;
    padding: 0;
  }
  
  .timer-container.mobile .time-text {
    color: var(--text-light);
  }

  .time-text.mobile {
    font-size: 2rem;
  }

  .pause-button.mobile {
    color: var(--text-light);
    font-size: 2rem;
    padding: 0;
    padding-left: 0.5rem;
  }
  
  .timer-display {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem 0.5rem;
    background: #ccc;
    border-radius: 8px;
    border: 2px solid transparent;
    position: relative;
    
    transition: all 0.3s ease;
  }
  
  .timer-display::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    border-radius: inherit;
    z-index: -1;
    opacity: 0;
    transition: opacity 0.3s ease;
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
    font-size: 2rem;
    color: var(--text-accent);
    font-weight: 900;
    font-variant-numeric: tabular-nums;
    color: var(--text-dark);
  }
  
  .timer-display.warning .time-text {
    color: #ff6666;
    text-shadow: 0 0 10px rgba(255, 68, 68, 0.8);
  }
  
  .pause-button {
    display: flex;
    font-size: 3rem;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
    background: transparent;
    padding-left: 1rem;
    margin: 0;
  }
  
  .pause-button:hover {
    transform: scale(1.25);
    background-color: transparent;
    box-shadow: none;
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
      padding-left: 10px;
      margin: 10px;
    }
    
    .time-text {
      font-size: 1.5rem;
    }
    
    .pause-button {
      font-size: 1.5rem;
    }
  }
</style>