<script lang="ts">
  import { onMount } from 'svelte';
  import type { TagCategory, TagScoreEntry } from '../lib/types';
  
  let { correctGuesses }: { correctGuesses: Partial<Record<TagCategory, TagScoreEntry[]>> } = $props();
  
  interface TagEntry {
    tag: string;
    actualTag?: string;
    category: TagCategory;
    points: number;
    order: number;
    wasFromAlias?: boolean;
    uniqueKey: string; // Add unique key for Svelte each blocks
  }
  
  let tagEntries = $state<TagEntry[]>([]);
  let containerElement: HTMLElement;
  let canScroll = $state(false);
  let tagOrder = $state(0);
  
  // Track previous guesses to detect new ones
  let previousGuesses = $state(new Set<string>());
  
  // Convert correctGuesses to sorted array with animations - only when actually needed
  $effect(() => {
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
    
    if (hasNewGuesses || tagEntries.length === 0) {
      const newEntries: TagEntry[] = [];
      
      Object.entries(correctGuesses).forEach(([category, tagScoreEntries]) => {
        if (tagScoreEntries) {
          tagScoreEntries.forEach(scoreEntry => {
            const uniqueGuessKey = `${scoreEntry.tag}-${category}`;
            
            // If this is a new guess, increment order
            if (!previousGuesses.has(uniqueGuessKey)) {
              tagOrder++;
            }
            
            newEntries.push({
              tag: scoreEntry.tag,
              actualTag: scoreEntry.actualTag,
              category: category as TagCategory,
              points: scoreEntry.score,
              order: tagOrder,
              wasFromAlias: scoreEntry.wasFromAlias,
              uniqueKey: `${scoreEntry.tag}-${category}-${tagOrder}` // Unique key combining tag, category, and order
            });
          });
        }
      });
      
      // Sort by points (descending), then by order (ascending) for ties
      newEntries.sort((a, b) => {
        if (a.points !== b.points) {
          return b.points - a.points;
        }
        return a.order - b.order;
      });
      
      tagEntries = newEntries;
      previousGuesses = currentGuesses;
    }
  });
  
  // Check if container can scroll
  $effect(() => {
    if (containerElement) {
      canScroll = containerElement.scrollHeight > containerElement.clientHeight;
    }
  });
  

  
  function scrollToNewTag() {
    if (containerElement && tagEntries.length > 0) {
      // Scroll to show the most recent tag
      const lastTagElement = containerElement.querySelector('.tag-item:last-child');
      if (lastTagElement) {
        lastTagElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }
  
  // Auto-scroll when new tags are added
  $effect(() => {
    if (tagEntries.length > 0) {
      setTimeout(scrollToNewTag, 100);
    }
  });
</script>

<div class="tag-list-container">
  <div 
    class="tag-list" 
    bind:this={containerElement}
    class:scrollable={canScroll}
  >
    {#each tagEntries as tagEntry, index (tagEntry.uniqueKey)}
      <div 
        class="tag-item {tagEntry.category}"
        class:special-category={tagEntry.category === 'artist' || tagEntry.category === 'character'}
        class:alias-tag={tagEntry.wasFromAlias}
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
    display: flex;
    flex-direction: column;
  }
  
  .tag-list {
    flex: 1;
    overflow-y: auto;
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
  
  .tag-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    margin-bottom: 0.375rem;
    border-radius: 6px;
    font-size: 1.125rem;
    font-weight: 600;
    transition: all 0.3s ease;
    animation: slideIn 0.5s ease-out;
    border-left: 4px solid;
  }
  
  .tag-item.special-category {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(4px);
  }
  
  .tag-item.alias-tag {
    opacity: 0.9;
    background: rgba(255, 255, 255, 0.05);
  }
  
  .alias-info {
    opacity: 0.7;
    font-size: 0.85em;
    margin-left: 0.5rem;
  }
  
  .tag-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .tag-points {
    font-size: 1rem;
    opacity: 0.8;
    margin-left: 0.5rem;
    font-weight: 700;
  }
  
  /* Tag category colors */
  .tag-item.general { 
    color: var(--tag-general); 
    border-left-color: var(--tag-general);
  }
  .tag-item.artist { 
    color: var(--tag-artist); 
    border-left-color: var(--tag-artist);
    background: rgba(242, 172, 8, 0.15);
  }
  .tag-item.contributor { 
    color: var(--tag-contributor); 
    border-left-color: var(--tag-contributor);
  }
  .tag-item.copyright { 
    color: var(--tag-copyright); 
    border-left-color: var(--tag-copyright);
  }
  .tag-item.character { 
    color: var(--tag-character); 
    border-left-color: var(--tag-character);
    background: rgba(0, 170, 0, 0.15);
  }
  .tag-item.species { 
    color: var(--tag-species); 
    border-left-color: var(--tag-species);
  }
  .tag-item.meta { 
    color: var(--tag-meta); 
    border-left-color: var(--tag-meta);
  }
  .tag-item.lore { 
    color: var(--tag-lore); 
    border-left-color: var(--tag-lore);
  }
  .tag-item.invalid { 
    color: var(--tag-invalid); 
    border-left-color: var(--tag-invalid);
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
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
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