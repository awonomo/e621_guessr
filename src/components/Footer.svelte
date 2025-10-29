<script lang="ts">
  import { onMount } from 'svelte';
  
  // Import version from package.json
  import packageJson from '../../package.json';
  const version = packageJson.version;
  
  // Get commit hash (will be injected at build time via env variable)
  const commitHash = import.meta.env.VITE_COMMIT_HASH || 'dev';
  const shortHash = commitHash.slice(0, 7);
  
  const githubRepoUrl = 'https://github.com/awonomo/e621_guessr';
  const commitUrl = commitHash !== 'dev' 
    ? `${githubRepoUrl}/commit/${commitHash}` 
    : githubRepoUrl;
</script>

<footer>
    <div class="footer-content">
        <small>
          by awonomo / <a href="https://ko-fi.com/awonomo">tip jar</a> / 
          v{version} - <a href={commitUrl} target="_blank" rel="noopener noreferrer" title="View commit on GitHub">{shortHash}</a>
        </small>
    </div>
</footer>   

<style>
    a {
        color : var(--bg-light);
    }

    footer {
    position: fixed;
    bottom: 1rem;
    }
</style>