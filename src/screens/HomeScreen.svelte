<script lang="ts">
  import { gameActions, userStats, dailyChallenge, isLoadingDaily } from '../lib/gameStore';
  import { onMount } from 'svelte';
  import Stats from '../components/Stats.svelte';
  
  let showStats = $state(false);
  
  function startNormalGame() {
    gameActions.navigateToSetup();
  }
  
  function startDailyChallenge() {
    gameActions.startDailyChallenge();
  }
  
  function toggleStats() {
    showStats = !showStats;
  }
</script>

<div class="home-screen">
  <!-- Hero Section -->
  <div class="hero">
    <!-- <div class="mascot-container">
      <img 
        src="https://static1.e621.net/data/e3/7a/e37aa3f786602f4dc8020f93675376f2.gif" 
        alt="Game mascot" 
        class="mascot"
      />
      <div class="mascot-credit">artist: tuwka</div>
    </div>
     -->
    <header class="logo-header">
      <h1>e621_guessr</h1>
      <!-- <span class="byline">by awonomo</span> -->
    </header>
  </div>
  
  <!-- Main Menu -->
  <div class="menu">
    <div class="menu-buttons">
      <button class="primary-button" onclick={startNormalGame}>
        Play Game
      </button>
      
      <button 
        class="daily-button" 
        onclick={startDailyChallenge}
        disabled={$isLoadingDaily}
      >
        {#if $isLoadingDaily}
          <span class="loading-content">
            <span class="spinner"></span>
            Loading Challenge...
          </span>
        {:else}
          Daily Challenge
        {/if}
      </button>
      
      <button class="secondary-button" onclick={toggleStats}>
        Stats
      </button>
      
      <!-- <button class="secondary-button" onclick={() => alert('Coming soon!')}>
        Settings
      </button> -->
    </div>
  </div>
  
  <!-- Statistics Modal -->
  {#if showStats}
    <Stats onClose={toggleStats} />
  {/if}
</div>

<style>
  .home-screen {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 2rem;
    background: var(--bg-primary);
  }
  
  .hero {
    text-align: center;
    margin-bottom: 3rem;
  }

  .logo-header {
  text-align: center;
  margin: 2rem 0;
}

  .logo-header h1 {
  margin: 0;
  margin-bottom: 0.5rem;
  color: var(--text-accent);
  font-weight: 200;
}
  
  .menu {
    width: 100%;
    max-width: 400px;
  }
  
  .menu-buttons {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .primary-button {
    background: var(--bg-accent);
    color: var(--bg-primary);
    padding: 1.25rem 2rem;
    font-size: 1.25rem;
    font-weight: 700;
    border-radius: var(--border-radius);
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .primary-button:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-heavy);
  }


  
  .daily-button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1rem 2rem;
    font-size: 1.1rem;
    font-weight: 600;
    border-radius: var(--border-radius);
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
  }

  .daily-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-heavy);
  }

  .daily-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }

  .loading-content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .secondary-button {
    background: var(--bg-secondary);
    color: var(--text-primary);
    padding: 1rem 2rem;
    font-size: 1rem;
    border-radius: var(--border-radius);
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .secondary-button:hover {
    background: #3a4558;
    transform: translateY(-1px);
  }
  
</style>