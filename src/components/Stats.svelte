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
      {#if $userStats.bestTag}
        <div class="stat-card best-tag-card">
          <BestTagDisplay 
            tag={$userStats.bestTag.tag}
            category={$userStats.bestTag.category}
            points={$userStats.bestTag.score}
          />
        </div>
      {:else}
        <div class="stat-card">
          <div class="stat-number">—</div>
          <div class="stat-label">Best Tag</div>
        </div>
      {/if}
      <div class="stat-card">
        <div class="stat-number">{$userStats.dailyChallengesCompleted}</div>
        <div class="stat-label">Daily Challenges</div>
      </div>
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
  .best-tag-card {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }
</style>
