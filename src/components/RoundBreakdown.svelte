<script lang="ts">
  import { onMount } from 'svelte';
  import type { RoundData, TagCategory } from '../lib/types';
  import PostViewer from './PostViewer.svelte';
  import { backendApi } from '../lib/backendApi';
  
  export let roundData: RoundData;
  export let roundNumber: number;
  
  // Store backend-calculated scores for all tags
  let tagScores: Map<string, number> = new Map();
  let isLoadingScores = true;
  
  // Score all tags when component mounts
  onMount(async () => {
    await scoreAllTags();
  });
  
  async function scoreAllTags() {
    try {
      // Collect all unique tags from the post
      const allTags: string[] = [];
      Object.values(roundData.post.tags).forEach(tagArray => {
        allTags.push(...tagArray);
      });
      
      console.log(`Scoring ${allTags.length} tags for round ${roundNumber}...`);
      const startTime = Date.now();
      
      // Score all tags in bulk
      const scores = await backendApi.scoreBulkTags(allTags);
      
      const endTime = Date.now();
      console.log(`Scored ${scores.length}/${allTags.length} tags in ${endTime - startTime}ms`);
      
      // Store scores in map for quick lookup
      scores.forEach(scoreResult => {
        if (scoreResult && scoreResult.actualTag) {
          tagScores.set(scoreResult.actualTag, scoreResult.score);
        }
      });
      
      // Trigger reactivity
      tagScores = new Map(tagScores);
    } catch (error) {
      console.error('Failed to score tags:', error);
    } finally {
      isLoadingScores = false;
    }
  }
  
  function getTagScore(tag: string, category: TagCategory): number {
    // Check if this tag was guessed and get its backend-calculated score
    const guessedInCategory = roundData.correctGuesses[category] || [];
    const guessedTag = guessedInCategory.find(entry => 
      entry.tag === tag || // Direct match
      entry.actualTag === tag // Alias match - the guess was aliased to this tag
    );
    
    if (guessedTag) {
      return guessedTag.score;
    }
    
    // For unguessed tags, check if we have a backend score
    if (tagScores.has(tag)) {
      return tagScores.get(tag)!;
    }
    
    // Fallback to client-side calculation if backend unavailable
    const basePoints = {
      general: 1200,
      artist: 600,
      copyright: 900,
      character: 1000,
      species: 1100,
      meta: 700,
      lore: 1500,
      invalid: 300
    };
    
    // Generate deterministic "rarity" bonus based on tag name
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = ((hash << 5) - hash + tag.charCodeAt(i)) & 0xffffffff;
    }
    
    // Create more interesting distribution similar to backend
    const normalizedHash = (Math.abs(hash) % 10000) / 10000; // 0-1
    const rarityMultiplier = 0.1 + (normalizedHash * 0.9); // 0.1-1.0 range
    
    const baseScore = basePoints[category] * rarityMultiplier;
    
    // Ensure minimum 100 points
    return Math.max(100, Math.round(baseScore));
  }
  
  function isTagGuessed(tag: string, category: TagCategory): boolean {
    const guessedInCategory = roundData.correctGuesses[category] || [];
    return guessedInCategory.some(entry => 
      entry.tag === tag || // Direct match
      entry.actualTag === tag // Alias match - the guess was aliased to this tag
    );
  }
  
  function getCategoryDisplayOrder() {
    return ['artist', 'copyright', 'character', 'species', 'lore', 'general', 'meta'];
  }
  
  function getConsolidatedTags() {
    const consolidated: Record<string, Array<{tag: string, originalCategory: TagCategory}>> = {};
    
    Object.entries(roundData.post.tags).forEach(([category, tags]) => {
      const categoryType = category as TagCategory;
      
      // Consolidate categories: Invalid -> General
      let displayCategory = categoryType;
      if (categoryType === 'invalid') {
        displayCategory = 'general';
      }
      
      if (!consolidated[displayCategory]) {
        consolidated[displayCategory] = [];
      }
      
      tags.forEach(tag => {
        consolidated[displayCategory].push({
          tag,
          originalCategory: categoryType
        });
      });
    });
    
    return consolidated;
  }
  
  $: consolidatedTags = getConsolidatedTags();
  $: orderedCategories = getCategoryDisplayOrder().filter(category => 
    consolidatedTags[category] && consolidatedTags[category].length > 0
  );
</script>

<div class="round-breakdown">
  <div class="round-content">
    <!-- <h2 class="round-title">ROUND {roundNumber}</h2> -->
    
    <div class="post-section">
      <PostViewer post={roundData.post} showBreakdownInfo={true} />
    </div>
    <div class="tags-section">
      {#if isLoadingScores}
        <div class="loading-indicator">
          <div class="spinner"></div>
          <p>Calculating tag scores...</p>
        </div>
      {:else}
        {#each orderedCategories as category}
          {@const tags = consolidatedTags[category]}
          <div class="category-section">
            <h3 class="category-title {category}">
              {category === 'artist' ? 'Artists' : 
               category === 'copyright' ? 'Copyrights' :
               category === 'character' ? 'Characters' :
               category === 'species' ? 'Species' :
               category === 'lore' ? 'Lore' :
               category === 'general' ? 'General' :
               category === 'meta' ? 'Meta' : category}
            </h3>
            <div class="tags-grid">
              {#each tags.sort((a, b) => getTagScore(b.tag, b.originalCategory) - getTagScore(a.tag, a.originalCategory)) as tagInfo}
                {@const points = getTagScore(tagInfo.tag, tagInfo.originalCategory)}
                {@const wasGuessed = isTagGuessed(tagInfo.tag, tagInfo.originalCategory)}
                <a href="https://e621.net/wiki_pages/show_or_new?title={tagInfo.tag}" target="_blank" class="tag-link">
                  <div class="tag-base tag-{tagInfo.originalCategory}" class:tag-guessed={wasGuessed}>
                    <span class="tag-name">{tagInfo.tag}</span>
                    <span class="tag-points">+{points}</span>
                  </div>
                </a>
              {/each}
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>

<style>
  .round-breakdown {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }
  
  .round-content {
    width: 100%;
    max-width: 1000px;
    text-align: center;
  }
  
  .round-title {
    font-size: 2.5rem;
    font-weight: 900;
    color: var(--text-accent);
    margin-bottom: 2rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  
  .post-section {
    width: 100%;
    margin-bottom: 3rem;
  }
  
  .tags-section {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  
  .category-section {
    text-align: left;
  }
  
  .category-title {
    font-size: 1.25rem;
    font-weight: 700;
    text-transform: capitalize;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid var(--bg-secondary);
  }
  
  .tags-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .tag-link {
    text-decoration: none;
    color: inherit;
    display: inline-block;
  }
  
  .tag-base {
    /* Override shared styles for breakdown grid layout */
    padding: 0.5rem 1rem;
    margin-bottom: 0;
    font-size: 0.95rem;
    animation: none; 
    background: var(--bg-secondary);
  }

  .tag-base * {
    cursor: pointer;
  }

  .tag-base:hover {
    transform: scale(1.2);
    color: var(--text-accent) !important;
    border-color: var(--text-accent) !important;
    box-shadow: 0px 0px 8px rgba(252, 179, 66, 0.5);
    cursor: pointer;
  }
  
  .tag-guessed {
    background: var(--success-bg) !important;
    color: var(--success-color) !important;
    border-color: var(--success-color) !important;
  }
  
  .loading-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    color: var(--text-secondary);
  }
  
  .spinner {
    width: 2rem;
    height: 2rem;
    border: 3px solid var(--bg-secondary);
    border-top: 3px solid var(--accent-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  /* Responsive Design */
  @media (max-width: 768px) {
    .round-breakdown {
      padding: 1rem;
    }
    
    .round-title {
      font-size: 2rem;
    }
    
    .tags-grid {
      gap: 0.5rem;
    }
    
    .tag-item {
      font-size: 0.875rem;
    }
  }
</style>