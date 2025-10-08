<script lang="ts">
  import { gameActions, userStats, dailyChallenge } from '../lib/gameStore';
  import { onMount } from 'svelte';
  
  let showStats = $state(false);
  
  async function loadDailyChallenge() {
    try {
      const response = await fetch('/api/daily');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          gameActions.setDailyChallenge(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to load daily challenge:', error);
    }
  }
  
  onMount(() => {
    loadDailyChallenge();
  });
  
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
      
      {#if $dailyChallenge}
        <button class="daily-button" onclick={startDailyChallenge}>
          Daily Challenge
          <span class="daily-date">{$dailyChallenge.date}</span>
        </button>
      {/if}
      
      <button class="secondary-button" onclick={toggleStats}>
        Statistics
      </button>
      
      <button class="secondary-button" onclick={() => alert('Coming soon!')}>
        Settings
      </button>
    </div>
  </div>
  
  <!-- Statistics Modal -->
  {#if showStats}
    <div 
      class="modal-overlay" 
      onclick={toggleStats}
      onkeydown={(e) => e.key === 'Escape' && toggleStats()}
      role="button" 
      tabindex="0"
    >
      <div 
        class="modal" 
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
        role="dialog" 
        tabindex="0"
      >
        <div class="modal-header">
          <h2>Your Statistics</h2>
          <button class="close-button" onclick={toggleStats}>×</button>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">{$userStats.gamesPlayed}</div>
            <div class="stat-label">Games Played</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-number">{$userStats.bestScore}</div>
            <div class="stat-label">Best Score</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-number">{Math.round($userStats.averageScore)}</div>
            <div class="stat-label">Average Score</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-number">{$userStats.totalTagsGuessed}</div>
            <div class="stat-label">Tags Found</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-number">{Math.round($userStats.accuracyRate * 100)}%</div>
            <div class="stat-label">Accuracy</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-number">{$userStats.dailyChallengesCompleted}</div>
            <div class="stat-label">Daily Challenges</div>
          </div>
        </div>
      </div>
    </div>
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
  
  .logo-header h1 {
    color: var(--text-accent);
    margin-bottom: 0.5rem;
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
  
  .daily-date {
    display: block;
    font-size: 0.875rem;
    opacity: 0.9;
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
  
  /* Modal styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .modal {
    background: var(--bg-secondary);
    border-radius: var(--border-radius);
    padding: 2rem;
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  
  .close-button {
    background: none;
    color: var(--text-secondary);
    border: none;
    font-size: 2rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }
  
  .close-button:hover {
    color: var(--text-primary);
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }
  
  .stat-card {
    background: var(--bg-primary);
    padding: 1.5rem;
    border-radius: var(--border-radius);
    text-align: center;
  }
  
  .stat-number {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-accent);
    margin-bottom: 0.5rem;
  }
  
  .stat-label {
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
</style>