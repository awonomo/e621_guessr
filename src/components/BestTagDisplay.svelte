<script lang="ts">
  import type { TagCategory } from '../lib/types';
  
  export let tag: string;
  export let category: TagCategory;
  export let points: number;
</script>

<div class="best-tag">
  <span class="label">best tag:</span>
  <span class="tag-name tag-{category}">{tag}</span>
  <span class="points">+{points}</span>
</div>

<style>
  .best-tag {
    font-size: 1.5rem;
    margin-top: 2rem;
    margin-bottom: 2rem;
    /* display: flex; */
    align-items: center;
    justify-content: center;
    /* gap: 0.5rem;
    flex-wrap: wrap; */
  }
  
  .best-tag .label {
    color: var(--text-secondary);
  }
  
  .tag-name {
    font-weight: 700;
    padding:  0.6rem;
    margin: 0.6rem;
    border-radius: 12px;
    background: var(--bg-secondary);
  }
  
  .best-tag .points {
    color: var(--success-color);
    font-weight: 700;
  }
  
  /* Responsive Design */
  @media (max-width: 768px) {
    .best-tag {
      font-size: 1.25rem;
      flex-direction: column;
      gap: 0.25rem;
    }
  }
</style>