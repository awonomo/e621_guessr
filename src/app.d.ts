/// <reference types="svelte" />
/// <reference types="vite/client" />

// Svelte 5 runes global types
declare global {
  var $state: typeof import('svelte').state;
  var $derived: typeof import('svelte').derived;
  var $effect: typeof import('svelte').effect;
  var $props: typeof import('svelte').props;
  var $bindable: typeof import('svelte').bindable;
  var $inspect: typeof import('svelte').inspect;
}

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface Platform {}
  }
}

export {};