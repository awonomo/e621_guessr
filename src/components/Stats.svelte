<script lang="ts">
  import BestTagDisplay from './BestTagDisplay.svelte';
  import { userStats } from '../lib/gameStore';
  export let onClose: () => void;
</script>

<div 
  class="modal-overlay" 
  onclick={onClose}
  onkeydown={(e) => e.key === 'Escape' && onClose()}
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
      <button class="close-button" onclick={onClose}>×</button>
    </div>
    <div class="stats-grid">
      <div class="stat-card" id="games-played-card">
        <div class="stat-number">{$userStats.gamesPlayed.toLocaleString()}</div>
        <div class="stat-label">Games Played</div>
      </div>
      <div class="stat-card" id="best-score-card">
        <div class="stat-number">{$userStats.bestScore.toLocaleString()}</div>
        <div class="stat-label">Best Score</div>
      </div>
      <div class="stat-card" id="average-score-card">
        <div class="stat-number">{Math.round($userStats.averageScore).toLocaleString()}</div>
        <div class="stat-label">Average Score</div>
      </div>
      <div class="stat-card" id="tags-found-card">
        <div class="stat-number">{$userStats.totalTagsGuessed.toLocaleString()}</div>
        <div class="stat-label">Tags Found</div>
      </div>
      <div class="stat-card" id="daily-challenges-card">
        <div class="stat-number">{$userStats.dailyChallengesCompleted.toLocaleString()}</div>
        <div class="stat-label">Daily Challenges</div>
      </div>

          
    <!-- Best Tag Card on its own row -->
    {#if $userStats.bestTag}
      <div class="best-tag-section">
        <div class="stat-card best-tag-card">
          <BestTagDisplay 
            tag={$userStats.bestTag.tag}
            category={$userStats.bestTag.category}
            points={$userStats.bestTag.score}
          />
        </div>
      </div>
    {:else}
      <div class="best-tag-section">
        <div class="stat-card">
          <div class="stat-number">—</div>
          <div class="stat-label">Best Tag</div>
        </div>
      </div>
    {/if}
    </div>

  </div>
</div>

<style>
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
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;
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

  #games-played-card {
    grid-column: 1;
    grid-row: 4;
  }

  #average-score-card {
    grid-column: 2;
    grid-row: 3;
  }

  #best-score-card {
    grid-column: 1 / 3;
    grid-row: 1;
  }

  #tags-found-card {
    grid-column: 1;
    grid-row: 3;
  }

  #daily-challenges-card {
    grid-column: 2;
    grid-row: 4;
  }

  .best-tag-section {
    grid-column: 1 / 3;
  }

  .best-tag-card {
    grid-row: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }
</style>
