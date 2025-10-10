<script lang="ts">
  import { onMount } from 'svelte';
  import { gameActions } from '../lib/gameStore';
  import type { GameSettings, Rating } from '../lib/types';
  
  // Settings persistence key
  const SETTINGS_KEY = 'e6TagChallenge_setupSettings';

  // Default settings
  const defaultSettings = {
    timeLimit: 120,
    gameMode: 'classic' as const,
    ratings: {
      safe: false,
      questionable: true,
      explicit: true
    },
    minUpvotes: 250,
    useMinUpvotes: true,
    customCriteria: ''
  };
  
  // Form state using runes
  let timeLimit = $state(defaultSettings.timeLimit);
  let gameMode = $state<'classic'>(defaultSettings.gameMode);
  let ratings = $state<{ [key in Rating]: boolean }>({ ...defaultSettings.ratings });
  let minUpvotes = $state(defaultSettings.minUpvotes);
  let useMinUpvotes = $state(defaultSettings.useMinUpvotes);
  let customCriteria = $state(defaultSettings.customCriteria);
  let isLoading = $state(false);
  let errorMessage = $state('');
  let hasLoadedSettings = $state(false); // Flag to prevent saving before loading

  // Load settings from localStorage
  function loadSettings() {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const settings = JSON.parse(saved);
        timeLimit = settings.timeLimit ?? defaultSettings.timeLimit;
        gameMode = settings.gameMode ?? defaultSettings.gameMode;
        ratings = { ...defaultSettings.ratings, ...settings.ratings };
        minUpvotes = settings.minUpvotes ?? defaultSettings.minUpvotes;
        useMinUpvotes = settings.useMinUpvotes ?? defaultSettings.useMinUpvotes;
        customCriteria = settings.customCriteria ?? defaultSettings.customCriteria;
        console.log('🔄 Loaded setup settings:', settings);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load setup settings:', error);
    } finally {
      // Set flag after loading (whether successful or not)
      hasLoadedSettings = true;
    }
  }

  // Save current settings to localStorage
  function saveSettings() {
    if (!hasLoadedSettings) {
      console.log('🚫 Skipping save - settings not loaded yet');
      return;
    }
    
    try {
      const settings = {
        timeLimit,
        gameMode,
        ratings: { ...ratings },
        minUpvotes,
        useMinUpvotes,
        customCriteria
      };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      console.log('💾 Saved setup settings:', settings);
    } catch (error) {
      console.warn('⚠️ Failed to save setup settings:', error);
    }
  }

  // Load settings when component mounts
  onMount(() => {
    loadSettings();
  });
  
  // Validation effects
  $effect(() => {
    if (timeLimit < 10) timeLimit = 10;
    if (timeLimit > 600) timeLimit = 600;
    if (minUpvotes > 2000) minUpvotes = 2000;
  });

  // Save settings whenever they change (but only after initial load)
  $effect(() => {
    if (hasLoadedSettings) {
      saveSettings();
    }
  });
  
  function toggleRating(rating: Rating) {
    const newRatings = { ...ratings };
    newRatings[rating] = !newRatings[rating];
    
    // Check if all would be deselected
    const hasAnySelected = Object.values(newRatings).some(Boolean);
    
    if (!hasAnySelected) {
      // If trying to deselect all, select all instead
      ratings = {
        safe: true,
        questionable: true,
        explicit: true
      };
    } else {
      ratings = newRatings;
    }
  }
  
  function buildTagsQuery(): string {
    const tags: string[] = [];
    
    // Handle ratings
    const selectedRatings = Object.entries(ratings)
      .filter(([, selected]) => selected)
      .map(([rating]) => rating);
    
    // Only add rating filters if not all ratings are selected (all selected = no filter needed)
    if (selectedRatings.length === 1) {
      const ratingMap = { safe: 'rating:s', questionable: 'rating:q', explicit: 'rating:e' };
      tags.push(ratingMap[selectedRatings[0] as Rating]);
    } else if (selectedRatings.length === 2) {
      const allRatings: Rating[] = ['safe', 'questionable', 'explicit'];
      const missing = allRatings.find(r => !selectedRatings.includes(r));
      if (missing) {
        const excludeMap = { safe: '-rating:s', questionable: '-rating:q', explicit: '-rating:e' };
        tags.push(excludeMap[missing]);
      }
    }
    // If selectedRatings.length === 3 (all selected), no rating filter is added
    
    // Minimum score
    if (useMinUpvotes && minUpvotes > 0) {
      tags.push(`score:>=${minUpvotes}`);
    }
    
    // Fixed tags for game quality
    tags.push('-animated', '-young', 'tagcount:>=50');
    
    // Custom criteria
    if (customCriteria.trim()) {
      tags.push(customCriteria.trim());
    }
    
    return tags.join(' ');
  }
  
  async function startGame() {
    errorMessage = '';
    
    // Note: Rating validation is no longer needed since we ensure at least one is always selected
    
    isLoading = true;
    
    try {
      const query = buildTagsQuery();
      const selectedRatings = Object.entries(ratings)
        .filter(([, selected]) => selected)
        .map(([rating]) => rating);
      
      const url = `/api/posts?limit=5&ratings=${selectedRatings.join(',')}&minScore=${minUpvotes}&customCriteria=${encodeURIComponent(customCriteria)}&tags=${encodeURIComponent('')}`;
      
      console.log('🔍 Fetching posts with query:', query);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch posts');
      }
      
      if (!data.data?.posts || data.data.posts.length === 0) {
        throw new Error('No posts found matching your criteria. Try different settings.');
      }
      
      // Create game settings
      const settings: GameSettings = {
        mode: gameMode,
        timeLimit,
        totalRounds: Math.min(5, data.data.posts.length),
        ratings: selectedRatings as Rating[],
        minUpvotes,
        customCriteria
      };
      
      // Start the game
      gameActions.startGame(settings, data.data.posts);
      
    } catch (error) {
      console.error('Failed to start game:', error);
      errorMessage = error instanceof Error ? error.message : 'Failed to start game. Please try again.';
    } finally {
      isLoading = false;
    }
  }
  
  function goBack() {
    gameActions.navigateToHome();
  }
</script>

<div class="setup-screen">
  <div class="container">
    <header class="header">
      <button class="back-button" onclick={goBack}>
        ← Back
      </button>
      <h1>Game Setup</h1>
    </header>
    
    <form class="setup-form" onsubmit={(e) => { e.preventDefault(); startGame(); }}>
      <div class="form-grid">
        <!-- Time limit -->
        <div class="form-group">
          <label for="timeLimit">Time Limit (seconds)</label>
          <input 
            id="timeLimit" 
            type="number" 
            min="10" 
            max="600"
            step="10"
            bind:value={timeLimit} 
          />
          <span class="help-text">{Math.floor(timeLimit / 60)}:{String(timeLimit % 60).padStart(2, '0')} per round</span>
        </div>

        <!-- Game mode -->
        <div class="form-group">
          <label for="gameMode">Game Mode</label>
          <select id="gameMode" bind:value={gameMode}>
            <option value="classic">Classic - Tag Guessing</option>
            <option value="timeAttack">Time Attack (Coming Soon)</option>
            <option value="endless">Endless Mode (Coming Soon)</option>
          </select>
        </div>

        <!-- Content ratings -->
        <div class="form-group span-2">
          <fieldset class="rating-fieldset">
            <legend>Content Rating</legend>
            <div class="rating-options">
              {#each Object.entries(ratings) as [rating, selected]}
                <button
                  type="button"
                  class="rating-button"
                  class:selected
                  onclick={() => toggleRating(rating as Rating)}
                >
                  {rating.charAt(0).toUpperCase() + rating.slice(1)}
                </button>
              {/each}
            </div>
          </fieldset>
        </div>

        <!-- Minimum upvotes -->
        <div class="form-group">
          <span class="label-text">Minimum Upvotes</span>
          <div class="upvotes-control">
            <div class="toggle-container">
              <button 
                type="button"
                class="toggle-button"
                class:active={useMinUpvotes}
                onclick={() => useMinUpvotes = !useMinUpvotes}
              >
                {useMinUpvotes ? 'ON' : 'OFF'}
              </button>
            </div>
            <div class="slider-container" class:disabled={!useMinUpvotes}>
              <input 
                type="range" 
                min="0" 
                max="2000"
                step="25"
                bind:value={minUpvotes}
                disabled={!useMinUpvotes}
                class="upvotes-slider"
              />
              <div class="slider-value">
                {minUpvotes.toLocaleString()}
              </div>
            </div>
          </div>
          <span class="help-text">
            {useMinUpvotes 
              ? `Only posts with ${minUpvotes}+ upvotes` 
              : 'All posts regardless of upvotes'}
          </span>
        </div>

        <!-- Custom criteria -->
        <div class="form-group">
          <label for="customCriteria">Custom Tags (Optional)</label>
          <input
            id="customCriteria"
            type="text"
            bind:value={customCriteria}
            placeholder=""
            maxlength="100"
          />
          <span class="help-text">Space-separated tags to include</span>
        </div>
      </div>

      {#if errorMessage}
        <div class="error-message">
          ⚠️ {errorMessage}
        </div>
      {/if}

      <div class="form-actions">
        <button type="button" class="secondary-button" onclick={goBack}>
          Cancel
        </button>
        <button 
          type="submit" 
          class="primary-button"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Start Game'}
        </button>
      </div>
    </form>
  </div>
</div>

<style>
  .setup-screen {
    min-height: 100vh;
    display: flex;
    align-items: center;
    background: var(--bg-primary);
    padding: 2rem 0;
  }
  
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 0 1rem;
  }
  
  .header {
    text-align: center;
    margin-bottom: 3rem;
    position: relative;
  }
  
  .back-button {
    position: absolute;
    left: 0;
    top: 0;
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: none;
    padding: 0.75rem 1rem;
    border-radius: var(--border-radius);
    cursor: pointer;
    font-weight: 600;
  }
  
  .back-button:hover {
    background: #3a4558;
  }
  
  .header h1 {
    color: var(--text-accent);
    margin-bottom: 0.5rem;
  }
  
  .label-text {
    font-weight: 500;
    color: var(--text-primary);
    display: block;
    margin-bottom: 0.5rem;
  }
  
  .setup-form {
    background: var(--bg-secondary);
    padding: 2rem;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-light);
  }
  
  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
  }
  
  .span-2 {
    grid-column: span 2;
  }
  
  label {
    color: var(--text-primary);
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  
  input, select {
    padding: 0.75rem;
    border: 2px solid transparent;
    border-radius: var(--border-radius);
    background: var(--text-primary);
    color: var(--bg-primary);
    font-size: 1rem;
  }
  
  input:focus, select:focus {
    outline: none;
    border-color: var(--bg-accent);
  }
  
  .help-text {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-top: 0.25rem;
  }
  
  .rating-fieldset {
    border: 2px solid var(--bg-primary);
    border-radius: var(--border-radius);
    padding: 1rem;
  }
  
  .rating-fieldset legend {
    color: var(--text-primary);
    font-weight: 600;
    padding: 0 0.5rem;
  }
  
  .rating-options {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }
  
  .rating-button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: var(--border-radius);
    background: var(--bg-primary);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    font-weight: 600;
    font-size: 1rem;
  }
  
  .rating-button:hover {
    background: var(--text-secondary);
    color: var(--bg-secondary);
  }
  
  .rating-button.selected {
    background: var(--bg-accent);
    color: var(--bg-primary);
  }
  
  .rating-button.selected:hover {
    background: var(--text-accent);
  }
  
  .upvotes-control {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .toggle-container {
    flex-shrink: 0;
  }
  
  .toggle-button {
    padding: 0.5rem 1rem;
    border: 2px solid var(--bg-primary);
    border-radius: var(--border-radius);
    background: var(--bg-primary);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    font-weight: 600;
    font-size: 0.875rem;
    width: 3.5rem;
  }
  
  .toggle-button:hover {
    background: var(--text-secondary);
    color: var(--bg-secondary);
  }
  
  .toggle-button.active {
    background: var(--bg-accent);
    color: var(--bg-primary);
    border-color: var(--bg-accent);
  }
  
  .slider-container {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: opacity 0.2s ease;
  }
  
  .slider-container.disabled {
    opacity: 0.5;
  }
  
  .upvotes-slider {
    flex: 1;
    -webkit-appearance: none;
    appearance: none;
    height: 2px;
    background: var(--bg-primary);
    outline: none;
    border-radius: 1px;
    cursor: pointer;
  }
  
  .upvotes-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    background: var(--bg-accent);
    cursor: pointer;
    border-radius: 50%;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  .upvotes-slider::-webkit-slider-thumb:hover {
    transform: scale(1.1);
    background: var(--text-accent);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }
  
  .upvotes-slider::-moz-range-thumb {
    width: 18px;
    height: 18px;
    background: var(--bg-accent);
    cursor: pointer;
    border-radius: 50%;
    border: none;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  .upvotes-slider::-moz-range-thumb:hover {
    transform: scale(1.1);
    background: var(--text-accent);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }
  
  .upvotes-slider:disabled {
    cursor: not-allowed;
  }
  
  .upvotes-slider:disabled::-webkit-slider-thumb {
    cursor: not-allowed;
  }
  
  .upvotes-slider:disabled::-moz-range-thumb {
    cursor: not-allowed;
  }
  
  .slider-value {
    font-weight: 600;
    color: var(--text-primary);
    min-width: 4rem;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  
  .error-message {
    background: var(--error);
    color: white;
    padding: 1rem;
    border-radius: var(--border-radius);
    margin-bottom: 1rem;
    font-weight: 600;
  }
  
  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }
  
  .primary-button {
    background: var(--bg-accent);
    color: var(--bg-primary);
    padding: 1rem 2rem;
    font-weight: 600;
    border: none;
    border-radius: var(--border-radius);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .primary-button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: var(--shadow-light);
  }
  
  .primary-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  .secondary-button {
    background: var(--bg-primary);
    color: var(--text-primary);
    padding: 1rem 2rem;
    font-weight: 600;
    border: 2px solid var(--bg-primary);
    border-radius: var(--border-radius);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .secondary-button:hover {
    background: transparent;
    border-color: var(--text-secondary);
  }
  
  @media (max-width: 768px) {
    .form-grid {
      grid-template-columns: 1fr;
    }
    
    .span-2 {
      grid-column: span 1;
    }
    
    .form-actions {
      flex-direction: column;
    }
    
    .back-button {
      position: static;
      margin-bottom: 1rem;
    }
    
    .upvotes-control {
      flex-direction: column;
      align-items: stretch;
      gap: 0.75rem;
    }
    
    .toggle-container {
      align-self: flex-start;
    }
    
    .slider-value {
      min-width: auto;
      text-align: left;
    }
  }
</style>