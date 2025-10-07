<script lang="ts">
  import type { Post } from '../lib/types';
  
  let { post, size = 'medium', showId = true }: { post: Post; size?: 'small' | 'medium' | 'large'; showId?: boolean } = $props();
</script>

<div class="post-thumbnail {size}">
  <a 
    href="https://e621.net/posts/{post.id}" 
    target="_blank" 
    rel="noopener noreferrer"
    class="post-link"
  >
    <img 
      src={post.preview.url} 
      alt="Post {post.id}"
      class="post-image"
      loading="lazy"
    />
    {#if showId}
      <div class="post-id">#{post.id}</div>
    {/if}
  </a>
</div>

<style>
  .post-thumbnail {
    position: relative;
    border-radius: var(--border-radius);
    overflow: hidden;
    transition: transform 0.2s ease;
  }
  
  .post-thumbnail:hover {
    transform: scale(1.02);
  }
  
  .post-link {
    display: block;
    text-decoration: none;
    color: inherit;
    position: relative;
  }
  
  .post-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    border-radius: var(--border-radius);
  }
  
  .post-id {
    position: absolute;
    bottom: 0.5rem;
    right: 0.5rem;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  
  /* Size variants */
  .small {
    width: 120px;
    height: 120px;
  }
  
  .medium {
    width: 200px;
    height: 200px;
  }
  
  .large {
    width: 300px;
    height: 300px;
  }
  
  /* Responsive adjustments */
  @media (max-width: 768px) {
    .small {
      width: 100px;
      height: 100px;
    }
    
    .medium {
      width: 150px;
      height: 150px;
    }
    
    .large {
      width: 200px;
      height: 200px;
    }
  }
</style>