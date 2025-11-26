<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { authApi, isLoading, authError, clearAuthError } from '../lib/authStore.js';
  
  export let showModal = false;
  
  const dispatch = createEventDispatcher();
  
  // Form state
  let mode: 'login' | 'register' | 'verify' = 'login';
  let email = '';
  let username = '';
  let password = '';
  let confirmPassword = '';
  let verificationMessage = '';
  let localErrors: string[] = [];
  
  // Form validation
  $: isFormValid = (() => {
    if (mode === 'login') {
      return email.length > 0 && password.length > 0;
    } else if (mode === 'register') {
      return email.length > 0 && 
             username.length >= 3 && 
             password.length >= 8 && 
             password === confirmPassword;
    }
    return false;
  })();
  
  // Clear errors when switching modes
  $: if (mode) {
    clearAuthError();
    localErrors = [];
  }
  
  function closeModal() {
    showModal = false;
    clearAuthError();
    localErrors = [];
    resetForm();
  }
  
  function resetForm() {
    email = '';
    username = '';
    password = '';
    confirmPassword = '';
    verificationMessage = '';
  }
  
  function switchMode(newMode: 'login' | 'register') {
    mode = newMode;
    resetForm();
  }
  
  async function handleSubmit() {
    if (!isFormValid || $isLoading) return;
    
    localErrors = [];
    
    if (mode === 'login') {
      const result = await authApi.login(email, password);
      
      if (result.success) {
        closeModal();
        dispatch('login-success');
      }
      // Errors are handled by the auth store
      
    } else if (mode === 'register') {
      // Basic client-side validation
      if (password !== confirmPassword) {
        localErrors = ['Passwords do not match'];
        return;
      }
      
      const result = await authApi.register(username, email, password);
      
      if (result.success) {
        mode = 'verify';
        verificationMessage = result.message || 'Please check your email to verify your account.';
        resetForm();
        dispatch('register-success');
      } else {
        if (result.errors) {
          localErrors = result.errors;
        }
      }
    }
  }
  
  async function handleResendVerification() {
    if (!email) {
      localErrors = ['Please enter your email address'];
      return;
    }
    
    const result = await authApi.resendVerification(email);
    verificationMessage = result.message || 'Verification email sent!';
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeModal();
    } else if (event.key === 'Enter' && isFormValid && !$isLoading) {
      handleSubmit();
    }
  }
</script>

<!-- Backdrop -->
{#if showModal}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div 
    class="modal-backdrop" 
    on:click={closeModal}
    on:keydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-label="Authentication"
    tabindex="-1"
  >
    <!-- Modal Content -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="modal-content" on:click|stopPropagation>
      <!-- Close Button -->
      <button class="close-button" on:click={closeModal} aria-label="Close">
        ×
      </button>
      
      {#if mode === 'verify'}
        <!-- Email Verification Screen -->
        <div class="verify-screen">
          <div class="icon">📧</div>
          <h2>Check Your Email</h2>
          <p class="verification-message">{verificationMessage}</p>
          
          <div class="help-text">
            <p>In development mode, the verification link is shown in the backend console.</p>
            <p>Check your terminal where the backend is running!</p>
          </div>
          
          <div class="actions">
            <button 
              type="button" 
              on:click={handleResendVerification}
              disabled={$isLoading}
              class="btn btn-secondary"
            >
              {$isLoading ? 'Sending...' : 'Resend Email'}
            </button>
            <button 
              type="button" 
              on:click={() => switchMode('login')}
              class="btn btn-link"
            >
              Back to Login
            </button>
          </div>
        </div>
        
      {:else}
        <!-- Login/Register Form -->
        <div class="form-container">
          <h2>{mode === 'login' ? 'Sign In' : 'Create Account'}</h2>
          
          <!-- Mode Switcher -->
          <div class="mode-switcher">
            <button 
              type="button"
              class="mode-button" 
              class:active={mode === 'login'}
              on:click={() => switchMode('login')}
            >
              Sign In
            </button>
            <button 
              type="button"
              class="mode-button" 
              class:active={mode === 'register'}
              on:click={() => switchMode('register')}
            >
              Sign Up
            </button>
          </div>
          
          <!-- Error Messages -->
          {#if $authError || localErrors.length > 0}
            <div class="error-messages">
              {#if $authError}
                <p class="error">{$authError}</p>
              {/if}
              {#each localErrors as error}
                <p class="error">{error}</p>
              {/each}
            </div>
          {/if}
          
          <!-- Form -->
          <form on:submit|preventDefault={handleSubmit}>
            {#if mode === 'register'}
              <div class="form-group">
                <label for="username">Username</label>
                <input 
                  type="text" 
                  id="username"
                  bind:value={username}
                  placeholder="Choose a username"
                  required
                  minlength="3"
                  maxlength="50"
                  pattern="[a-zA-Z0-9_]+"
                  title="Username can only contain letters, numbers, and underscores"
                  disabled={$isLoading}
                />
                <small>3-50 characters, letters, numbers, and underscores only</small>
              </div>
            {/if}
            
            <div class="form-group">
              <label for="email">Email</label>
              <input 
                type="email" 
                id="email"
                bind:value={email}
                placeholder="your@email.com"
                required
                disabled={$isLoading}
              />
            </div>
            
            <div class="form-group">
              <label for="password">Password</label>
              <input 
                type="password" 
                id="password"
                bind:value={password}
                placeholder={mode === 'register' ? '8+ characters required' : 'Your password'}
                required
                minlength={mode === 'register' ? 8 : 1}
                disabled={$isLoading}
              />
              {#if mode === 'register'}
                <small>At least 8 characters with uppercase, lowercase, and number</small>
              {/if}
            </div>
            
            {#if mode === 'register'}
              <div class="form-group">
                <label for="confirmPassword">Confirm Password</label>
                <input 
                  type="password" 
                  id="confirmPassword"
                  bind:value={confirmPassword}
                  placeholder="Repeat your password"
                  required
                  disabled={$isLoading}
                />
              </div>
            {/if}
            
            <button 
              type="submit" 
              class="btn btn-primary submit-btn"
              disabled={!isFormValid || $isLoading}
            >
              {#if $isLoading}
                <span class="loading">⟳</span>
                {mode === 'login' ? 'Signing In...' : 'Creating Account...'}
              {:else}
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              {/if}
            </button>
          </form>
          
          {#if mode === 'register'}
            <div class="info-text">
              <p>By creating an account, you can:</p>
              <ul>
                <li>Save your game stats across devices</li>
                <li>Compete on leaderboards</li>
                <li>Track your progress over time</li>
              </ul>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }
  
  .modal-content {
    background: var(--bg-primary, #1a1a2e);
    border-radius: 12px;
    padding: 2rem;
    max-width: 400px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    position: relative;
    border: 1px solid var(--border-color, #333);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  }
  
  .close-button {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--text-secondary, #999);
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s;
  }
  
  .close-button:hover {
    background: var(--bg-secondary, #252548);
    color: var(--text-primary, #fff);
  }
  
  .verify-screen {
    text-align: center;
    padding: 1rem 0;
  }
  
  .icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
  
  .verification-message {
    color: var(--text-primary, #fff);
    margin-bottom: 1rem;
    line-height: 1.5;
  }
  
  .help-text {
    background: var(--bg-secondary, #252548);
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    border-left: 3px solid var(--accent-color, #3b82f6);
  }
  
  .help-text p {
    margin: 0.5rem 0;
    color: var(--text-secondary, #999);
    font-size: 0.9rem;
  }
  
  .form-container h2 {
    text-align: center;
    margin-bottom: 1.5rem;
    color: var(--text-primary, #fff);
  }
  
  .mode-switcher {
    display: flex;
    background: var(--bg-secondary, #252548);
    border-radius: 8px;
    padding: 0.25rem;
    margin-bottom: 1.5rem;
  }
  
  .mode-button {
    flex: 1;
    padding: 0.75rem;
    border: none;
    background: transparent;
    color: var(--text-secondary, #999);
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s;
    font-weight: 500;
  }
  
  .mode-button.active {
    background: var(--accent-color, #3b82f6);
    color: white;
  }
  
  .error-messages {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 6px;
    padding: 0.75rem;
    margin-bottom: 1rem;
  }
  
  .error {
    color: #ef4444;
    margin: 0.25rem 0;
    font-size: 0.9rem;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text-primary, #fff);
    font-weight: 500;
  }
  
  .form-group input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color, #333);
    border-radius: 6px;
    background: var(--bg-secondary, #252548);
    color: var(--text-primary, #fff);
    font-size: 1rem;
    transition: border-color 0.2s;
  }
  
  .form-group input:focus {
    outline: none;
    border-color: var(--accent-color, #3b82f6);
  }
  
  .form-group input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .form-group small {
    display: block;
    margin-top: 0.25rem;
    color: var(--text-secondary, #999);
    font-size: 0.8rem;
  }
  
  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.2s;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
  
  .btn-primary {
    background: var(--accent-color, #3b82f6);
    color: white;
  }
  
  .btn-primary:hover:not(:disabled) {
    background: var(--accent-hover, #2563eb);
  }
  
  .btn-secondary {
    background: var(--bg-secondary, #252548);
    color: var(--text-primary, #fff);
    border: 1px solid var(--border-color, #333);
  }
  
  .btn-secondary:hover:not(:disabled) {
    background: var(--bg-tertiary, #353566);
  }
  
  .btn-link {
    background: transparent;
    color: var(--accent-color, #3b82f6);
    padding: 0.5rem;
  }
  
  .btn-link:hover {
    text-decoration: underline;
  }
  
  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .submit-btn {
    width: 100%;
    margin-top: 0.5rem;
  }
  
  .loading {
    display: inline-block;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    align-items: center;
  }
  
  .info-text {
    margin-top: 1.5rem;
    padding: 1rem;
    background: var(--bg-secondary, #252548);
    border-radius: 8px;
  }
  
  .info-text p {
    color: var(--text-primary, #fff);
    margin: 0 0 0.5rem 0;
    font-weight: 500;
  }
  
  .info-text ul {
    margin: 0;
    padding-left: 1.5rem;
    color: var(--text-secondary, #999);
  }
  
  .info-text li {
    margin: 0.25rem 0;
    font-size: 0.9rem;
  }
  
  /* Responsive adjustments */
  @media (max-width: 480px) {
    .modal-content {
      padding: 1.5rem;
      margin: 1rem;
    }
  }
</style>