<script lang="ts">
  import { user, isAuthenticated, authApi } from '../lib/authStore.js';
  import AuthModal from './AuthModal.svelte';
  
  let showAuthModal = false;
  let showUserMenu = false;
  
  function toggleUserMenu() {
    showUserMenu = !showUserMenu;
  }
  
  function closeUserMenu() {
    showUserMenu = false;
  }
  
  function openAuthModal() {
    showAuthModal = true;
    closeUserMenu();
  }
  
  async function handleLogout() {
    await authApi.logout();
    closeUserMenu();
  }
  
  // Close user menu when clicking outside
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as Element;
    if (!target.closest('.user-menu-container')) {
      closeUserMenu();
    }
  }
</script>

<!-- User Menu Container -->
<div class="user-menu-container">
  {#if $isAuthenticated && $user}
    <!-- Authenticated User Menu -->
    <button 
      class="user-button" 
      on:click={toggleUserMenu}
      aria-label="User menu"
    >
      <div class="user-avatar">
        {$user.username.charAt(0).toUpperCase()}
      </div>
      <span class="username">{$user.username}</span>
      <span class="chevron" class:open={showUserMenu}>▼</span>
    </button>
    
    {#if showUserMenu}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="backdrop" on:click={closeUserMenu}></div>
      
      <div class="user-dropdown">
        <div class="user-info">
          <div class="user-details">
            <span class="display-name">{$user.username}</span>
            <span class="email">{$user.email}</span>
          </div>
          {#if !$user.isVerified}
            <div class="verification-status">
              <span class="unverified">⚠️ Unverified</span>
            </div>
          {:else}
            <div class="verification-status">
              <span class="verified">✅ Verified</span>
            </div>
          {/if}
        </div>
        
        <div class="menu-divider"></div>
        
        <div class="menu-items">
          <button class="menu-item" on:click={closeUserMenu}>
            <span class="icon">📊</span>
            View Stats
          </button>
          <button class="menu-item" on:click={closeUserMenu}>
            <span class="icon">🏆</span>
            Leaderboards
          </button>
          <button class="menu-item" on:click={closeUserMenu}>
            <span class="icon">⚙️</span>
            Settings
          </button>
        </div>
        
        <div class="menu-divider"></div>
        
        <button class="menu-item logout" on:click={handleLogout}>
          <span class="icon">👋</span>
          Sign Out
        </button>
      </div>
    {/if}
  {:else}
    <!-- Sign In Button -->
    <button class="sign-in-button" on:click={openAuthModal}>
      <span class="icon">👤</span>
      Sign In
    </button>
  {/if}
</div>

<!-- Auth Modal -->
<AuthModal 
  bind:showModal={showAuthModal}
  on:login-success={() => {
    console.log('User logged in successfully');
  }}
  on:register-success={() => {
    console.log('User registered successfully');
  }}
/>

<!-- Click outside handler -->
<svelte:window on:click={handleClickOutside} />

<style>
  .user-menu-container {
    position: relative;
    display: inline-block;
  }
  
  .user-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--bg-secondary, #252548);
    border: 1px solid var(--border-color, #333);
    border-radius: 8px;
    color: var(--text-primary, #fff);
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.9rem;
  }
  
  .user-button:hover {
    background: var(--bg-tertiary, #353566);
    border-color: var(--accent-color, #3b82f6);
  }
  
  .user-avatar {
    width: 2rem;
    height: 2rem;
    background: var(--accent-color, #3b82f6);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 0.8rem;
    color: white;
  }
  
  .username {
    font-weight: 500;
    max-width: 8rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .chevron {
    font-size: 0.7rem;
    transition: transform 0.2s;
    margin-left: auto;
  }
  
  .chevron.open {
    transform: rotate(180deg);
  }
  
  .sign-in-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--accent-color, #3b82f6);
    border: none;
    border-radius: 8px;
    color: white;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
  }
  
  .sign-in-button:hover {
    background: var(--accent-hover, #2563eb);
    transform: translateY(-1px);
  }
  
  .backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 998;
  }
  
  .user-dropdown {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    min-width: 15rem;
    background: var(--bg-primary, #1a1a2e);
    border: 1px solid var(--border-color, #333);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    z-index: 999;
    overflow: hidden;
  }
  
  .user-info {
    padding: 1rem;
    background: var(--bg-secondary, #252548);
  }
  
  .user-details .display-name {
    display: block;
    font-weight: 600;
    color: var(--text-primary, #fff);
    margin-bottom: 0.25rem;
  }
  
  .user-details .email {
    display: block;
    font-size: 0.8rem;
    color: var(--text-secondary, #999);
  }
  
  .verification-status {
    margin-top: 0.5rem;
  }
  
  .verified {
    font-size: 0.7rem;
    color: #10b981;
    font-weight: 500;
  }
  
  .unverified {
    font-size: 0.7rem;
    color: #f59e0b;
    font-weight: 500;
  }
  
  .menu-divider {
    height: 1px;
    background: var(--border-color, #333);
  }
  
  .menu-items {
    padding: 0.5rem 0;
  }
  
  .menu-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border: none;
    background: none;
    color: var(--text-primary, #fff);
    cursor: pointer;
    transition: background-color 0.2s;
    font-size: 0.9rem;
    text-align: left;
  }
  
  .menu-item:hover {
    background: var(--bg-secondary, #252548);
  }
  
  .menu-item.logout {
    color: #ef4444;
  }
  
  .menu-item.logout:hover {
    background: rgba(239, 68, 68, 0.1);
  }
  
  .menu-item .icon {
    font-size: 0.9rem;
    width: 1.2rem;
    text-align: center;
  }
  
  /* Responsive adjustments */
  @media (max-width: 768px) {
    .user-dropdown {
      right: -1rem;
      min-width: 12rem;
    }
    
    .username {
      display: none;
    }
    
    .user-button {
      padding: 0.5rem;
    }
    
    .sign-in-button {
      padding: 0.5rem 0.75rem;
      font-size: 0.8rem;
    }
  }
</style>