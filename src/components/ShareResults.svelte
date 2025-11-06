<script lang="ts">
  import type { GameSession } from '../lib/types';
  
  export let session: GameSession;
  export let isDaily: boolean = false;
  export let dailyDate: string | null = null;
  
  let showModal = false;
  let shareText = '';
  
  // Check if native share is available (mobile devices)
  const hasNativeShare = typeof navigator !== 'undefined' && 'share' in navigator && 'canShare' in navigator;
  
  function generateShareText(): string {
    const totalScore = session.totalScore.toLocaleString();
    const totalTags = session.rounds.reduce((sum, round) => {
      return sum + Object.values(round.correctGuesses).flat().length;
    }, 0);
    const totalPossibleTags = session.rounds.reduce((sum, round) => {
      return sum + Object.values(round.post.tags).flat().length;
    }, 0);
    
    // Find best round score
    const bestRound = session.rounds.reduce((best, round) => {
      return round.score > best.score ? round : best;
    }, session.rounds[0]);
    
    // Find best tag score across all rounds
    let bestTagScore = 0;
    session.rounds.forEach(round => {
      Object.values(round.correctGuesses).forEach(guesses => {
        guesses.forEach(guess => {
          if (guess.score > bestTagScore) {
            bestTagScore = guess.score;
          }
        });
      });
    });
    
    let lines: string[] = [];
    
    // Title line
    if (isDaily && dailyDate) {
      lines.push(`e621guessr daily ${dailyDate}`);
    } else {
      // Format game mode based on settings
      const timeLimit = session.settings.timeLimit;
      const timeStr = session.settings.mode === 'timeAttack'
        ? 'time attack'
        : timeLimit === -1 
          ? 'untimed' 
          : timeLimit < 60 
            ? `${timeLimit}s`
            : `${timeLimit / 60}m`;
      lines.push(`e621guessr - ${timeStr} classic`);
    }
    
    // Stats
    lines.push(`★ ${totalScore} points 🏆`);
    lines.push(`★ ${totalTags}/${totalPossibleTags} tags guessed`);
    lines.push(`★ best round +${bestRound.score.toLocaleString()} pts.`);
    lines.push(`★ best tag +${bestTagScore.toLocaleString()} pts.`);
    
    // Custom tags theme (only for non-daily)
    if (!isDaily && session.settings.customCriteria && session.settings.customCriteria.trim().length > 0) {
      lines.push(`theme: ${session.settings.customCriteria}`);
    }
    
    // Call to action
    if (isDaily) {
      lines.push("beat my score: e621-guessr.vercel.app");
    } else {
      lines.push('beat my score: e621-guessr.vercel.app');
    }
    
    return lines.join('\n');
  }
  
  async function handleShare() {
    shareText = generateShareText();
    
    const shareData = {
      title: isDaily ? `e621guessr daily ${dailyDate}` : 'e621guessr',
      text: shareText,
      url: 'https://e621-guessr.vercel.app'
    };
    
    if (hasNativeShare && navigator.canShare && navigator.canShare(shareData)) {
      // Use native share on mobile
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or share failed
        console.log('Share cancelled or failed:', err);
        // Fallback to modal if native share fails
        showModal = true;
      }
    } else {
      // Show modal on desktop
      showModal = true;
    }
  }
  
  function closeModal() {
    showModal = false;
  }
  
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && showModal) {
      closeModal();
    }
  }
  
  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(shareText);
      // Could add a toast notification here
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
  
  function shareToTelegram() {
    const url = encodeURIComponent('https://e621-guessr.vercel.app');
    const text = encodeURIComponent(shareText);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
    closeModal();
  }
  
  function shareToBluesky() {
    const text = encodeURIComponent(shareText);
    window.open(`https://bsky.app/intent/compose?text=${text}`, '_blank');
    closeModal();
  }

  function shareToMastodon() {
    const text = encodeURIComponent(shareText);
    // Mastodon requires the instance URL, so we'll open the composer on the main site
    // Users can then choose their instance
    window.open(`https://mastodon.social/share?text=${text}`, '_blank');
    closeModal();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<button class="share-button action-buttons" on:click={handleShare}>
  share
</button>

{#if showModal}
  <!-- svelte-ignore a11y-click-events-have-key-keys -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div 
    class="modal-overlay" 
    on:click={closeModal}
    on:keydown={(e) => e.key === 'Escape' && closeModal()}
    role="button"
    tabindex="0"
  >
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div 
      class="modal-content" 
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      tabindex="0"
    >
      <div class="modal-header">
        <h2>Share Your Score</h2>
        <button class="close-button" on:click={closeModal}>×</button>
      </div>
      
      <div class="share-preview">
        <pre>{shareText}</pre>
      </div>
      
      <div class="share-actions">
        <button class="icon-share-button copy" on:click={copyToClipboard} title="Copy to clipboard">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
          </svg>
        </button>
        
        <button class="icon-share-button telegram" on:click={shareToTelegram} title="Share to Telegram">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512" fill="currentColor">
            <path d="M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm121.8 169.9l-40.7 191.8c-3 13.6-11.1 16.9-22.4 10.5l-62-45.7-29.9 28.8c-3.3 3.3-6.1 6.1-12.5 6.1l4.4-63.1 114.9-103.8c5-4.4-1.1-6.9-7.7-2.5l-142 89.4-61.2-19.1c-13.3-4.2-13.6-13.3 2.8-19.7l239.1-92.2c11.1-4 20.8 2.7 17.2 19.5z"/>
          </svg>
        </button>
        
        <button class="icon-share-button bluesky" on:click={shareToBluesky} title="Share to Bluesky">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 530" fill="currentColor">
            <path d="m135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z"/>
          </svg>
        </button>
        
        <button class="icon-share-button mastodon" on:click={shareToMastodon} title="Share to Mastodon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 216.4144 232.00976" fill="currentColor">
            <path d="M211.80734 139.0875c-3.18125 16.36625-28.4925 34.2775-57.5625 37.74875-15.15875 1.80875-30.08375 3.47125-45.99875 2.74125-26.0275-1.1925-46.565-6.2125-46.565-6.2125 0 2.53375.15625 4.94625.46875 7.2025 3.38375 25.68625 25.47 27.225 46.39125 27.9425 21.11625.7225 39.91875-5.20625 39.91875-5.20625l.8675 19.09s-14.77 7.93125-41.08125 9.39c-14.50875.7975-32.52375-.365-53.50625-5.91875C9.23234 213.82 1.40609 165.31125.20859 116.09125c-.365-14.61375-.14-28.39375-.14-39.91875 0-50.33 32.97625-65.0825 32.97625-65.0825C49.67234 3.45375 78.20359.2425 107.86484 0h.72875c29.66125.2425 58.21125 3.45375 74.8375 11.09 0 0 32.975 14.7525 32.975 65.0825 0 0 .41375 37.13375-4.59875 62.915"/>
            <path d="M177.50984 80.077v60.94125h-24.14375v-59.15c0-12.46875-5.24625-18.7975-15.74-18.7975-11.6025 0-17.4175 7.5075-17.4175 22.3525v32.37625H96.20734V85.42325c0-14.845-5.81625-22.3525-17.41875-22.3525-10.49375 0-15.74 6.32875-15.74 18.7975v59.15H38.90484V80.077c0-12.455 3.17125-22.3525 9.54125-29.675 6.56875-7.3225 15.17125-11.07625 25.85-11.07625 12.355 0 21.71125 4.74875 27.8975 14.2475l6.01375 10.08125 6.015-10.08125c6.185-9.49875 15.54125-14.2475 27.8975-14.2475 10.6775 0 19.28 3.75375 25.85 11.07625 6.36875 7.3225 9.54 17.22 9.54 29.675"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .share-button {
    margin: 1rem;
    font-size: 2rem;
    color: var(--text-dark);
    border: none;
    padding: 1rem 3rem;
    font-weight: 700;
    border-radius: 25px;
    cursor: pointer;
    transition: all 0.3s ease;
    background: var(--bg-light);
  }

  .share-button:hover {
    transform: scale(1.05);
  }
  
  /* Modal Overlay */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
    animation: fadeIn 0.2s ease-out;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  .modal-content {
    background: var(--bg-primary);
    border: 2px solid var(--accent-primary);
    border-radius: 12px;
    padding: 2rem;
    max-width: 500px;
    width: 100%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    animation: fadeIn 0.2s ease-out;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  
  .modal-header h2 {
    margin: 0;
    color: var(--text-light);
    font-size: 1.5rem;
  }
  
  .close-button {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 2rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }
  
  .close-button:hover {
    color: var(--text-primary);
  }
  
  .share-preview {
    background: var(--bg-light);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }
  
  .share-preview pre {
    text-align: left;
    margin: 0;
    font-family: monospace;
    font-size: 0.9rem;
    line-height: 1.6;
    color: var(--text-dark);
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  
  .share-actions {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }

  .action-buttons {
    margin-bottom: 2rem;
  }
  
  .icon-share-button {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 14px;
  }
  
  /* .icon-share-button svg {
    width: 100%;
    height: 100%;
  } */
  
  .icon-share-button:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }
  
  .icon-share-button:active {
    transform: scale(0.95);
  }
  
  /* Platform-specific colors */
  .icon-share-button.copy {
    background: #6c757d;
    color: white;
  }
  
  .icon-share-button.copy:hover {
    background: #5a6268;
  }
  
  .icon-share-button.telegram {
    background: white;
    color: #0088cc;
    padding: 0;
  }
  
  .icon-share-button.telegram:hover {
    background: #f0f0f0;
  }
  
  .icon-share-button.bluesky {
    background: #1185fe;
    color: white;
  }
  
  .icon-share-button.bluesky:hover {
    background: #0d6edb;
  }
  
  .icon-share-button.discord {
    background: #5865F2;
    color: white;
  }
  
  .icon-share-button.discord:hover {
    background: #4752c4;
  }
  
  .icon-share-button.mastodon {
    background: #6364FF;
    color: white;
  }
  
  .mastodon:hover {
    background: #563acc;
  }
  
  /* Mobile Responsive */
  @media (max-width: 768px) {
    .modal-content {
      padding: 1.5rem;
    }
    
    .share-preview pre {
      font-size: 0.85rem;
    }
    
    .icon-share-button {
      width: 56px;
      height: 56px;
      padding: 12px;
    }
    
    .icon-share-button.telegram {
      padding: 0;
    }

    .share-button {
      padding: 0.875rem 2rem;
      font-size: 1.125rem;
    }
  }
</style>
