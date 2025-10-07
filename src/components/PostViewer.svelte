<script lang="ts">
  import type { Post } from '../lib/types';
  
  let { post, isPaused = false }: { post: Post; isPaused?: boolean } = $props();
  
  let imageLoaded = $state(false);
  let imageError = $state(false);
  let imgElement = $state<HTMLImageElement>();
  
  // Use sample URL if available, fallback to full file URL
  let imageUrl = $derived(post.sample?.url || post.file?.url || '');
  let imageAlt = $derived(`Post ${post.id}`);
  
  // Check if image is already cached when URL changes
  $effect(() => {
    if (imageUrl) {
      checkIfImageCached();
    }
  });
  
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
  $effect(() => {
    if (imgElement && imageUrl && imgElement.complete && imgElement.naturalWidth > 0) {
      imageLoaded = true;
      imageError = false;
    }
  });
</script>

<div class="post-viewer" class:paused={isPaused}>
  {#if imageError}
    <div class="error-state">
      <p>Failed to load image</p>
      <small>Post ID: {post.id}</small>
    </div>
  {:else}
    <img
      bind:this={imgElement}
      src={imageUrl}
      alt={imageAlt}
      onload={handleImageLoad}
      onerror={handleImageError}
      class="post-image"
      class:loaded={imageLoaded}
      loading="eager"
    />
    
    {#if !imageLoaded}
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading image...</p>
      </div>
    {/if}
  {/if}
  
  {#if isPaused}
    <div class="pause-overlay">
      <h2>Game Paused</h2>
    </div>
  {/if}
</div>

<style>
  .post-viewer {
    position: relative;
    width: 100%;
    height: 100%;
    max-height: 70vh;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--border-radius);
    overflow: hidden;
    background: var(--bg-secondary);
    box-shadow: var(--shadow-light);
    transition: filter 0.3s ease;
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
  }
  
  .post-image.loaded {
    opacity: 1;
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
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.95); /* Almost completely black */
    color: var(--text-primary);
    z-index: 10;
    transition: opacity 0.3s ease;
  }
  
  .pause-overlay h2 {
    font-size: 2.5rem;
    font-weight: 700;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
    margin: 0;
    color: #ffffff;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  /* Responsive sizing */
  @media (max-width: 768px) {
    .post-viewer {
      max-height: 50vh;
    }
    
    .pause-overlay h2 {
      font-size: 2rem;
    }
  }
</style>