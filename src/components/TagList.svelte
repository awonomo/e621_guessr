<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  import type { TagCategory, TagScoreEntry } from '../lib/types';
  
  export let correctGuesses: Partial<Record<TagCategory, TagScoreEntry[]>>;
  
  interface TagEntry {
    tag: string;
    actualTag?: string;
    category: TagCategory;
    points: number;
    order: number;
    wasFromAlias?: boolean;
    uniqueKey: string; // Add unique key for Svelte each blocks
  }
  
  let tagEntries: TagEntry[] = [];
  let containerElement: HTMLElement;
  let canScroll = false;
  let tagOrder = 0;
  
  // Track previous guesses to detect new ones and manage animations
  let previousGuesses = new Set<string>();
  let newlyAddedTags = new Set<string>();
  
  // Simple reactive statement to debug prop changes
  $: console.log('[TagList] Simple reactive - correctGuesses changed:', correctGuesses);
  
  // Convert correctGuesses to sorted array - sort by most recent guess (order)
  $: if (correctGuesses) {
    console.log('[TagList] Reactive statement triggered');
    console.log('[TagList] correctGuesses:', correctGuesses);
    
    const currentGuesses = new Set<string>();
    
    // First, collect all current guesses to check if anything actually changed
    Object.entries(correctGuesses).forEach(([category, tagEntries]) => {
      if (tagEntries) {
        tagEntries.forEach(entry => {
          const uniqueKey = `${entry.tag}-${category}`;
          currentGuesses.add(uniqueKey);
        });
      }
    });
    
    // Only update if there are actual new guesses
    const hasNewGuesses = Array.from(currentGuesses).some(guess => !previousGuesses.has(guess));
    console.log('[TagList] hasNewGuesses:', hasNewGuesses);
    
    if (hasNewGuesses || tagEntries.length === 0) {
      console.log('[TagList] Updating tag entries...');
      
      // Clear newly added tags from previous update
      newlyAddedTags.clear();
      
      const newEntries: TagEntry[] = [];
      
      Object.entries(correctGuesses).forEach(([category, tagScoreEntries]) => {
        if (tagScoreEntries) {
          tagScoreEntries.forEach(scoreEntry => {
            const uniqueGuessKey = `${scoreEntry.tag}-${category}`;
            
            // If this is a new guess, increment order and mark as newly added
            if (!previousGuesses.has(uniqueGuessKey)) {
              tagOrder++;
              newlyAddedTags.add(uniqueGuessKey);
            }
            
            newEntries.push({
              tag: scoreEntry.tag,
              actualTag: scoreEntry.actualTag,
              category: category as TagCategory,
              points: scoreEntry.score,
              order: tagOrder,
              wasFromAlias: scoreEntry.wasFromAlias,
              uniqueKey: `${scoreEntry.tag}-${category}-${scoreEntry.score}` // Use score to ensure uniqueness
            });
          });
        }
      });
      
      // Sort by most recent guess (order descending) - newest first
      newEntries.sort((a, b) => b.order - a.order);
      
      console.log('[TagList] Final newEntries (sorted by recency):', newEntries);
      tagEntries = newEntries;
      previousGuesses = currentGuesses;
      
      // Clear newly added tags after a short delay to remove animation
      setTimeout(() => {
        newlyAddedTags.clear();
        newlyAddedTags = new Set(newlyAddedTags); // Trigger reactivity
      }, 500);
    } else {
      console.log('[TagList] No update needed - no new guesses');
    }
  }
  
  // Check if container can scroll
  afterUpdate(() => {
    if (containerElement) {
      canScroll = containerElement.scrollHeight > containerElement.clientHeight;
    }
  });
  

  
  function scrollToNewTag() {
    if (containerElement && tagEntries.length > 0) {
      // Scroll to top to show the most recent tag
      containerElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  
  // Auto-scroll when new tags are added
  $: if (tagEntries.length > 0) {
    setTimeout(scrollToNewTag, 100);
  }
</script>

<div class="tag-list-container">
  <div 
    class="tag-list" 
    bind:this={containerElement}
    class:scrollable={canScroll}
  >
    <!-- Debug: Show tagEntries length -->
    <!-- <div style="color: red; font-size: 12px; margin-bottom: 10px;">
      Debug: tagEntries.length = {tagEntries.length}
    </div> -->
    
    {#each tagEntries as tagEntry, index (tagEntry.uniqueKey)}
      <div 
        class="tag-base tag-{tagEntry.category}"
        class:tag-special-category={tagEntry.category === 'artist' || tagEntry.category === 'character'}
        class:tag-alias={tagEntry.wasFromAlias}
        class:tag-new={newlyAddedTags.has(`${tagEntry.tag}-${tagEntry.category}`)}
      >
        <span class="tag-name">
          {tagEntry.tag}
          {#if tagEntry.wasFromAlias && tagEntry.actualTag}
            <small class="alias-info">→ {tagEntry.actualTag}</small>
          {/if}
        </span>
        <span class="tag-points">+{tagEntry.points}</span>
      </div>
    {/each}
    
    {#if tagEntries.length === 0}
      <div class="empty-state">
        <p>No tags found yet...</p>
        <small>Start guessing!</small>
      </div>
    {/if}
  </div>
  
  {#if canScroll}
    <div class="scroll-indicator">
      <div class="scroll-arrow">⌄</div>
    </div>
  {/if}
  
  <div class="fade-edge"></div>
</div>

<style>
  .tag-list-container {
    position: relative;
    flex: 1;
    min-height: 0;
    max-height: none; /* Remove viewport constraint - let parent control height */
    display: flex;
    flex-direction: column;
    overflow: hidden; /* Ensure container doesn't expand */
  }
  
  .tag-list {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden; /* Prevent horizontal overflow */
    padding-right: 0.5rem;
    scroll-behavior: smooth;
  }
  
  .tag-list::-webkit-scrollbar {
    width: 4px;
  }
  
  .tag-list::-webkit-scrollbar-track {
    background: var(--bg-primary);
    border-radius: 2px;
  }
  
  .tag-list::-webkit-scrollbar-thumb {
    background: var(--text-secondary);
    border-radius: 2px;
  }
  
  .tag-list::-webkit-scrollbar-thumb:hover {
    background: var(--text-accent);
  }
  
  /* Component-specific tag overrides */
  /* No longer needed - styles are in app.css */
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    color: var(--text-secondary);
    text-align: center;
  }
  
  .empty-state p {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
  }
  
  .empty-state small {
    opacity: 0.7;
    font-size: 1rem;
  }
  
  .scroll-indicator {
    position: absolute;
    bottom: 0;
    right: 0;
    background: linear-gradient(transparent, var(--bg-primary));
    height: 2rem;
    width: 100%;
    display: flex;
    align-items: end;
    justify-content: center;
    pointer-events: none;
  }
  
  .scroll-arrow {
    color: var(--text-secondary);
    font-size: 1.25rem;
    animation: bounce 2s infinite;
  }
  
  .fade-edge {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2rem;
    background: linear-gradient(transparent, var(--bg-primary));
    pointer-events: none;
    opacity: 0.5;
  }
  
  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-5px);
    }
    60% {
      transform: translateY(-3px);
    }
  }
</style>