<script lang="ts">
  import type { Post } from '../lib/types';
  import { currentRound } from '../lib/gameStore';
  
  export let post: Post;
  export let isPaused = false;
  export let showBreakdownInfo = false;
  export let quitGame: (() => void) | undefined = undefined;
  export let skipRound: (() => void) | undefined = undefined;
  export let pausesRemaining: number | undefined = undefined;
  export let pauseLimitReached: boolean | undefined = undefined;
  export let roundNumber: number | undefined = undefined;
  export let totalRounds: number | undefined = undefined;
  
  let imageLoaded = false;
  let imageError = false;
  let imgElement: HTMLImageElement;
  
  // Use sample URL if available, fallback to full file URL
  $: imageUrl = post.sample?.url || post.file?.url || '';
  $: imageAlt = `Post ${post.id}`;
  
  // Conditionally set image source to prevent inspector circumvention
  $: actualImageSrc = isPaused ? '' : imageUrl;
  
  // Check if image is already cached when URL changes
  $: if (imageUrl && !isPaused) {
    checkIfImageCached();
  }
  
  function checkIfImageCached() {
    if (!imageUrl) return;
    
    // Reset state first
    imageLoaded = false;
    imageError = false;
    
    // Create a test image to check if it's already cached
    const testImg = new Image();
    
    // Set up handlers before setting src
    testImg.onload = () => {
      // Image is cached and loaded successfully
      imageLoaded = true;
      imageError = false;
    };
    testImg.onerror = () => {
      // Image failed to load
      imageLoaded = false;
      imageError = false; // Let the main img element handle the error
    };
    
    // Set the source - this will trigger immediate loading if cached
    testImg.src = imageUrl;
    
    // If the image is already complete (cached), set loaded immediately
    if (testImg.complete && testImg.naturalWidth > 0) {
      imageLoaded = true;
      imageError = false;
    }
  }
  
  function handleImageLoad() {
    imageLoaded = true;
    imageError = false;
  }
  
  function handleImageError() {
    imageLoaded = false;
    imageError = true;
  }
  
  // Check if image is already loaded when element is bound
  $: if (imgElement && actualImageSrc && imgElement.complete && imgElement.naturalWidth > 0) {
    imageLoaded = true;
    imageError = false;
  }
</script>

<div class="post-viewer" class:paused={isPaused}>
  {#if imageError}
    <div class="error-state">
      <p>Failed to load image</p>
      <small>Post ID: {post.id}</small>
    </div>
  {:else}
    {#if showBreakdownInfo}
      <a 
        href="https://e621.net/posts/{post.id}" 
        target="_blank" 
        rel="noopener noreferrer"
        class="post-link"
      >
        <img
          bind:this={imgElement}
          src={actualImageSrc}
          alt={imageAlt}
          on:load={handleImageLoad}
          on:error={handleImageError}
          class="post-image"
          class:loaded={imageLoaded}
          loading="eager"
        />
        <div class="post-id">#{post.id}</div>
      </a>
    {:else}
      <img
        bind:this={imgElement}
        src={actualImageSrc}
        alt={imageAlt}
        on:load={handleImageLoad}
        on:error={handleImageError}
        class="post-image"
        class:loaded={imageLoaded}
        loading="eager"
      />
    {/if}
    
    {#if !imageLoaded}
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading image...</p>
      </div>
    {/if}
  {/if}
  
  {#if isPaused}
    <div class="pause-overlay">
      {#if roundNumber !== undefined}
        <p class="round-info">Round {roundNumber}{#if totalRounds} /{totalRounds}{/if}</p>
      {/if}
      <h2>Game Paused</h2>
      {#if pauseLimitReached}
        <p class="pause-info">No pauses remaining</p>
      {:else if pausesRemaining !== undefined}
        <p class="pause-info">{pausesRemaining} {pausesRemaining === 1 ? 'pause' : 'pauses'} remaining</p>
      {/if}
      <div class="pause-actions">
        {#if skipRound}
          <button class="skip-button" on:click={skipRound}>Skip Round</button>
        {/if}
        {#if quitGame}
          <button class="quit-button" on:click={quitGame}>Quit Game</button>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .post-viewer {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--border-radius);
    overflow: hidden;
    background: rgba(0, 0, 0, 0);
    transition: filter 0.3s ease;
    min-height: 0;
  }
  
  .post-image {
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
    object-fit: contain;
    border-radius: var(--border-radius);
    opacity: 0;
    transition: opacity 0.3s ease;
    display: block;
  }
  
  .post-image.loaded {
    opacity: 1;
  }
  
  .post-link {
    display: block;
    text-decoration: none;
    color: inherit;
    position: relative;
    cursor: pointer;
  }
  .post-link .post-image {
    cursor: pointer;
  }
  
  .post-id {
    position: absolute;
    bottom: 0.75rem;
    right: 0.75rem;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 0.375rem 0.75rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 600;
    z-index: 5;
  }
  
  .loading-state {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    color: var(--text-secondary);
    background: var(--bg-secondary);
  }
  
  .loading-spinner {
    width: 3rem;
    height: 3rem;
    border: 3px solid var(--bg-primary);
    border-top: 3px solid var(--text-accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: var(--error);
    padding: 2rem;
    text-align: center;
  }
  
  .pause-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: var(--bg-secondary);
    border-radius: var(--border-radius);
    color: var(--text-primary);
    z-index: 10;
    transition: opacity 0.3s ease;
  }
  
  .pause-overlay h2 {
    font-size: 2.5rem;
    font-weight: 700;
    text-shadow: 0 2px 8px rgba(0, 0, 0, );
    margin: 0;
    color: #ffffff;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  
  .round-info {
    font-size: 1rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
    margin: 0 0 1rem 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .pause-info {
    font-size: 1.2rem;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.9);
    margin: 1rem 0 0 0;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
    opacity: 0.9;
  }
  
  .pause-actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
  }
  
  .skip-button, .quit-button {
    padding: 0.875rem 2rem;
    font-size: 1.125rem;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    min-width: 140px;
  }
  
  .skip-button {
    background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
    color: white;
  }
  
  .skip-button:hover {
    background: linear-gradient(135deg, #5a9eec 0%, #4588c7 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(74, 144, 226, 0.4);
  }
  
  .quit-button {
    background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    color: white;
  }
  
  .quit-button:hover {
    background: linear-gradient(135deg, #f15c4c 0%, #d0493b 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(231, 76, 60, 0.4);
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  /* Responsive sizing */
  @media (max-width: 768px) {
    .post-viewer {
      min-height: 300px;
      overflow: visible;
    }

    .post-image {
      min-height: 300px;
      max-height: none;
    }

    .pause-overlay h2 {
      font-size: 2rem;
    }
    
    .pause-info {
      font-size: 1rem;
    }
    
    .pause-actions {
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 1.5rem;
      width: 100%;
      max-width: 300px;
      padding: 0 1rem;
    }
    
    .skip-button, .quit-button {
      width: 100%;
      padding: 1rem;
      font-size: 1rem;
      min-width: unset;
    }
  }
</style>