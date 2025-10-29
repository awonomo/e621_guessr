import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { execSync } from 'node:child_process';

// Get git commit hash
function getGitHash(): string {
  try {
    return execSync('git rev-parse HEAD').toString().trim();
  } catch (e) {
    console.warn('Could not get git commit hash:', e);
    return 'unknown';
  }
}

export default defineConfig({
  plugins: [svelte()],
  define: {
    'import.meta.env.VITE_COMMIT_HASH': JSON.stringify(getGitHash())
  },
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  },
  resolve: {
    alias: {
      $lib: '/src/lib',
      $components: '/src/components',
      $types: '/src/lib/types'
    }
  }
});