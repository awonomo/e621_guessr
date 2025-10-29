<script lang="ts">
  import { onMount } from 'svelte';
  import { Previous } from 'runed';
  import type { GuessResult } from '../lib/types';
  
  interface Props {
    disabled?: boolean;
    placeholder?: string;
    onsubmit?: (event: { guess: string }) => Promise<any> | void;
  }
  
  let { disabled = false, placeholder = "Enter your guess...", onsubmit }: Props = $props();
  
  let inputValue = $state('');
  let inputElement: HTMLInputElement;
  let isSubmitting = $state(false);
  let recentGuesses = $state<string[]>([]);
  let isShaking = $state(false);
  let isGlowing = $state(false);
  
  // Command history navigation state  
  let commandHistory = $state<string[]>([]);
  let historyIndex = $state(-1); // -1 means not navigating history
  let originalInput = $state(''); // Store original input when navigating history
  
  // Track previous input value using runed utility for enhanced state management
  const previousInput = new Previous(() => inputValue);
  
  onMount(() => {
    // Focus the input when component mounts
    if (inputElement && !disabled) {
      inputElement.focus();
    }
  });
  
  // Auto-focus when enabled
  $effect(() => {
    if (inputElement && !disabled) {
      inputElement.focus();
    }
  });
  
  function normalizeInput(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_'); // Convert spaces to underscores
  }
  
  function handleInput(event) {
    // Convert spaces to underscores as user types, just like the old version
    inputValue = event.target.value.toLowerCase().replace(/\s+/g, "_");
    
    // Reset history navigation when user manually types
    historyIndex = -1;
    originalInput = '';
  }
  
  async function handleSubmit() {
    if (isSubmitting || disabled || !inputValue.trim()) return;
    
    const guess = inputValue.trim(); // Input is already normalized
    
    // Check for duplicate recent guesses
    if (recentGuesses.includes(guess)) {
      showFeedback('Already guessed!', 'warning');
      triggerShake();
      return;
    }
    
    isSubmitting = true;
    
    try {
      // Call the submit callback and wait for result
      const result = await onsubmit?.({ guess });
      
      // Check if the guess was rate-limited
      if (result && result.rateLimited) {
        showFeedback('Too many guesses! Wait a moment...', 'warning');
        triggerShake();
        // Don't clear input, don't add to history - let player try again
        isSubmitting = false;
        return;
      }
      
      // Check if the guess was blocked by custom criteria
      if (result && result.blockedByCustomCriteria) {
        showFeedback('Cannot guess tags from custom criteria!', 'warning');
        triggerShake();
        // Don't clear input, don't add to history - let player try again
        isSubmitting = false;
        return;
      }
      
      // Check if the guess was incorrect (assuming result has isCorrect property)
      if (result && result.isCorrect === false) {
        triggerShake();
      }
      
      // Check if the guess was correct
      if (result && result.isCorrect === true) {
        triggerGlow();
      }
      
      // Only clear input and add to history for valid guesses
      // Add to recent guesses for duplicate checking
      recentGuesses = [guess, ...recentGuesses.slice(0, 4)]; // Keep last 5
      
      // Add to command history for arrow key navigation (keep last 10)
      commandHistory = [guess, ...commandHistory.slice(0, 9)]; 
      
      // Clear input and reset state
      inputValue = '';
      historyIndex = -1;
      originalInput = '';
      
    } catch (error) {
      console.error('Error submitting guess:', error);
      showFeedback('Error submitting guess', 'error');
    }
    
    isSubmitting = false;
    
    // Refocus input
    if (inputElement) {
      inputElement.focus();
    }
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
    } else if (event.key === 'Escape') {
      inputValue = '';
      historyIndex = -1;
      originalInput = '';
      if (inputElement) {
        inputElement.blur();
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      navigateHistory('up');
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      navigateHistory('down');
    }
  }
  
  function navigateHistory(direction: 'up' | 'down') {
    if (commandHistory.length === 0) return;
    
    // Store original input when first entering history navigation
    if (historyIndex === -1) {
      originalInput = inputValue;
    }
    
    if (direction === 'up') {
      // Move up in history (older entries)
      if (historyIndex < commandHistory.length - 1) {
        historyIndex++;
        inputValue = commandHistory[historyIndex];
      }
    } else if (direction === 'down') {
      // Move down in history (newer entries)
      if (historyIndex > 0) {
        historyIndex--;
        inputValue = commandHistory[historyIndex];
      } else if (historyIndex === 0) {
        // Return to original input
        historyIndex = -1;
        inputValue = originalInput;
      }
    }
  }
  
  function triggerShake() {
    isShaking = true;
    setTimeout(() => {
      isShaking = false;
    }, 600); // Duration of shake animation
  }
  
  function triggerGlow() {
    isGlowing = true;
    setTimeout(() => {
      isGlowing = false;
    }, 800); // Duration of glow animation
  }
  
  function showFeedback(message: string, type: 'success' | 'warning' | 'error') {
    // Create temporary feedback element
    const feedback = document.createElement('div');
    feedback.textContent = message;
    feedback.className = `feedback-message ${type}`;
    feedback.style.cssText = `
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
      background: var(--bg-secondary);
      color: var(--text-primary);
      padding: 0.5rem 1rem;
      border-radius: 4px;
      z-index: 1000;
      animation: feedbackSlide 2s ease-out forwards;
      border: 3px solid ${type === 'success' ? '#4CAF50' : type === 'warning' ? '#FF9800' : '#F44336'};
    `;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes feedbackSlide {
        0% { opacity: 0; transform: translate(-50%, 20px); }
        15%, 85% { opacity: 1; transform: translate(-50%, 0); }
        100% { opacity: 0; transform: translate(-50%, -20px); }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(feedback);
    
    // Clean up after animation
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.parentNode.removeChild(feedback);
      }
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    }, 2000);
  }
</script>

<div class="guess-input-container" class:disabled class:shaking={isShaking}>
  <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="guess-form">
    <div class="input-wrapper" class:glowing={isGlowing}>
      <input
        bind:this={inputElement}
        bind:value={inputValue}
        oninput={handleInput}
        onkeydown={handleKeydown}
        type="text"
        class="guess-input"
        class:submitting={isSubmitting}
        {placeholder}
        {disabled}
        autocomplete="off"
        spellcheck="false"
        maxlength="50"
      />
      
      <button 
        type="submit"
        class="submit-button"
        class:submitting={isSubmitting}
        disabled={disabled || !inputValue.trim() || isSubmitting}
        title="Submit guess (Enter)"
      >
        {#if isSubmitting}
          <div class="spinner"></div>
        {:else}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 12l7-7v4h11v6H9v4l-7-7z"/>
          </svg>
        {/if}
      </button>
    </div>
    
    <!-- {#if recentGuesses.length > 0}
      <div class="recent-guesses">
        <small>Recent:</small>
        {#each recentGuesses.slice(0, 3) as guess}
          <span class="recent-guess">{guess}</span>
        {/each}
      </div>
    {/if} -->
  </form>
</div>

<style>
  .guess-input-container {
    width: 100%;
    max-width: 600px;
    z-index: 100;
  }
  
  .guess-input-container.disabled {
    opacity: 0.6;
    pointer-events: none;
  }
  
  .guess-input-container.shaking {
    animation: shake 0.6s ease-in-out;
  }


  
  .guess-form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .input-wrapper {
    display: flex;
    align-items: center;
    background: var(--bg-light);
    border: 2px solid var(--accent-primary);
    border-radius: 25px;
    padding: 0.25rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
  }
  
  .input-wrapper:focus-within {
    border-color: var(--accent-secondary);
    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.4),
                0 0 0 4px rgba(var(--accent-primary-rgb), 0.2);
    transform: translateY(-2px);
  }
  
  .input-wrapper.glowing {
    animation: successGlow 0.5s ease-out;
  }
  
  .guess-input {
    flex: 1;
    background: transparent;
    border: none;
    padding: 0.5rem 1rem;
    font-size: 1.25rem;
    color: var(--text-dark);
    outline: none;
    font-family: inherit;
    font-weight: 500;
  }
  
  .guess-input::placeholder {
    color: var(--text-secondary);
    opacity: 0.7;
  }
  
  .guess-input:disabled {
    opacity: 0.5;
  }
  
  .submit-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    background: var(--accent-primary);
    border: none;
    border-radius: 50%;
    color: var(--bg-primary);
    cursor: pointer;
    transition: all 0.2s ease;
    margin-right: 0.25rem;
  }
  
  .submit-button:hover:not(:disabled) {
    background: var(--accent-secondary);
    transform: scale(1.05);
  }
  
  .submit-button:active:not(:disabled) {
    transform: scale(0.95);
  }
  
  .submit-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  .submit-button.submitting {
    background: var(--text-secondary);
  }
  
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  .recent-guesses {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0 1rem;
    opacity: 0.8;
  }
  
  .recent-guesses small {
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
  
  .recent-guess {
    background: var(--bg-secondary);
    color: var(--text-secondary);
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.875rem;
    border: 1px solid var(--accent-primary);
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
    20%, 40%, 60%, 80% { transform: translateX(8px); }
  }
  
  @keyframes successGlow {
    0% {
      background: var(--bg-light);
    }
    50% {
      background: rgb(67, 203, 115);
    }
    100% {
      background: var(--bg-light);
    }
  }
  
  /* Mobile adjustments */
  @media (max-width: 768px) {
    .guess-input-container {
      width: calc(100% - 1rem);
      bottom: 0.5rem;
    }
    
    .input-wrapper {
      border-radius: 20px;
    }
    
    .guess-input {
      padding: 0.6rem 0.75rem;
      font-size: 1.125rem;
    }
    
    .submit-button {
      width: 2.5rem;
      height: 2.5rem;
    }
    
    .recent-guesses {
      padding: 0 0.75rem;
    }
  }
  
  /* High contrast mode */
  @media (prefers-contrast: high) {
    .input-wrapper {
      border-width: 3px;
    }
    
    .submit-button {
      border: 2px solid var(--text-primary);
    }
  }
</style>