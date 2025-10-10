<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  import type { TagCategory, TagScoreEntry, RoundData } from '../lib/types';

  export let roundData: RoundData;
  
  interface TagEntry {
    tag: string;
    actualTag?: string;
    category: TagCategory;
    points: number;
    wasFromAlias?: boolean;
    uniqueKey: string; // Add unique key for Svelte each blocks
  }
  
  let tagEntries: TagEntry[] = [];
  let containerElement: HTMLElement;
  let canScroll = false;
  
  // Track previous guesses to detect new ones and manage animations
  let previousGuesses = new Set<string>();
  let newlyAddedTags = new Set<string>();
  
  // Flatten all correct guesses and sort by timestamp (most recent at top)
  $: if (roundData && roundData.correctGuesses) {
    tagEntries = Object.values(roundData.correctGuesses)
      .flat()
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((scoreEntry, idx) => ({
        tag: scoreEntry.tag,
        actualTag: scoreEntry.actualTag,
        category: scoreEntry.category,
        points: scoreEntry.score,
        wasFromAlias: scoreEntry.wasFromAlias,
        uniqueKey: `${scoreEntry.tag}-${scoreEntry.category}-${scoreEntry.score}-${scoreEntry.timestamp}`
      }));
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
    
    <!-- {#if tagEntries.length === 0}
      <div class="empty-state">
        <small>Start guessing!</small>
      </div>
    {/if} -->
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
    overflow-x: hidden;
    padding-right: 0.5rem;
    scroll-behavior: smooth;
  }
  
  .scrollable {
    scrollbar-width: none;
  }
  
  .scrollable::-webkit-scrollbar {
    -ms-overflow-style: none;  /* IE and Edge */
    display: none;
  }

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
    display: none;
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

    @media (max-width: 768px) {
      .fade-edge{
        display: none;
      }

      .tag-list-container::-webkit-scrollbar {
        display: none;
      }
      .tag-list {
        /* background-color: var(--bg-secondary); */
      }

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