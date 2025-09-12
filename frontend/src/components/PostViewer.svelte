<script>
  import { onMount, createEventDispatcher } from "svelte";
  export let currentPost;
</script>

<section class="PostViewer">
  <img
    src={currentPost.sample?.url || currentPost.file.url}
    alt={`Post ${currentPost.id}`}
  />
</section>

<style>
  .PostViewer {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    box-sizing: border-box;
    padding: 0.5rem;
  }
  .PostViewer img {
    max-width: 100%;
    max-height: 80vh;
    height: auto;
    width: auto;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 2px 16px rgba(0,0,0,0.15);
    background: #222;
    display: block;
    margin: 0 auto;
  }
</style>
