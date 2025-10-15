import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
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