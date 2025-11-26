<script lang="ts">
  import { onMount } from 'svelte';
  import { currentState, gameActions, initializeAuthenticatedStats } from './lib/gameStore';
  import { initializeAuth } from './lib/authStore';
  
  // Import screen components
  import HomeScreen from './screens/HomeScreen.svelte';
  import SetupScreen from './screens/SetupScreen.svelte'; 
  import GameplayScreen from './screens/GameplayScreen.svelte';
  import CountdownScreen from './screens/CountdownScreen.svelte';
  import RoundSummaryScreen from './screens/RoundSummaryScreen.svelte';
  import GameSummaryScreen from './screens/GameSummaryScreen.svelte';
  import AgeVerificationModal from './components/AgeVerificationModal.svelte';
  import Footer from './components/Footer.svelte';
  
  // Age verification state using runes
  let showAgeVerification = $state(false);
  let isAgeVerified = $state(false);
  
  // Check if user has already verified their age
  function checkAgeVerification(): boolean {
    try {
      const stored = localStorage.getItem('ageVerified');
      if (!stored) return false;
      
      const verification = JSON.parse(stored);
      const now = Date.now();
      
      // Check if verification exists and hasn't expired
      if (verification.verified && verification.expires > now) {
        return true;
      } else {
        // Remove expired verification
        localStorage.removeItem('ageVerified');
        return false;
      }
    } catch (error) {
      // If there's any error parsing, assume not verified
      return false;
    }
  }
  
  function handleAgeVerification(event: { isAdult: boolean }) {
    if (event.isAdult) {
      isAgeVerified = true;
      showAgeVerification = false;
    }
    // If not adult, they will be redirected away by the modal component
  }
  
  onMount(async () => {
    // Initialize authentication system
    initializeAuth();
    
    // Initialize auth-aware stats (loads database stats if user is already logged in)
    await initializeAuthenticatedStats();
    
    // Check age verification on app load
    isAgeVerified = checkAgeVerification();
    if (!isAgeVerified) {
      showAgeVerification = true;
    }
  });
</script>

<main class="app">
  {#if showAgeVerification}
    <AgeVerificationModal onverified={handleAgeVerification} />
  {:else if isAgeVerified}
    {#if $currentState === 'home'}
      <HomeScreen />
    {:else if $currentState === 'setup'}
      <SetupScreen />
    {:else if $currentState === 'countdown'}
      <CountdownScreen />
    {:else if $currentState === 'playing'}
      <GameplayScreen />
    {:else if $currentState === 'roundSummary'}
      <RoundSummaryScreen />
    {:else if $currentState === 'gameSummary'}
      <GameSummaryScreen />
    {:else}
      <!-- Fallback -->
      <HomeScreen />
    {/if}
  {:else}
    <!-- Loading state while checking verification -->
    <div class="loading-screen">
      <div class="loading-spinner"></div>
    </div>
  {/if}
</main>

<style>
  .app {
    min-height: 100vh;
    background: var(--bg-primary);
    color: var(--text-primary);
  }
  
  .loading-screen {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-primary);
  }
  
  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--bg-secondary);
    border-top: 3px solid var(--accent-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>