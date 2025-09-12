<script>
  export let currentPost;
  export let correctGuesses = {};
  $: totalTags = Object.keys(currentPost.tags).reduce(
    (sum, k) => sum + currentPost.tags[k].length,
    0
  );
</script>

<div class="total-tags"><strong>Total Tags:</strong> {totalTags}</div>
<div class="tags-list">
  <strong>Tags:</strong>
  {#if Object.keys(correctGuesses).length === 0}
    <div>None yet</div>
  {/if}
  {#each Object.entries(correctGuesses) as [category, guesses]}
    <div class="tag-row">
      <strong>{category}:</strong>
      {#each guesses as t}
        <span class="tag" style="color: var(--tag-{category}, #b4c7d9);">{t}</span>
      {/each}
    </div>
  {/each}
</div>

<style>
  .total-tags {
    margin-bottom: 1rem;
  }
  .tags-list {
    margin-bottom: 1rem;
  }
  .tag-row {
    margin-bottom: 0.5rem;
  }
  :root {
    --tag-general: #b4c7d9;
    --tag-artist: #f2ac08;
    --tag-contributor: silver;
    --tag-copyright: #d0d;
    --tag-character: #0a0;
    --tag-species: #ed5d1f;
    --tag-meta: #fff;
    --tag-lore: #282;
    --tag-invalid: #ff3d3d;
  }
  .tag {
    margin-right: 6px;
    display: inline-block;
    font-weight: 600;
    transition: color 0.2s;
  }
</style>
