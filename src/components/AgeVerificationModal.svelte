<script lang="ts">
  interface Props {
    onverified: (event: { isAdult: boolean }) => void;
  }
  
  let { onverified }: Props = $props();
  
  function handleVerification(isAdult: boolean) {
    if (isAdult) {
      // Store verification in localStorage with expiration (common practice)
      const verification = {
        verified: true,
        timestamp: Date.now(),
        // Expire after 30 days (industry standard)
        expires: Date.now() + (30 * 24 * 60 * 60 * 1000)
      };
      localStorage.setItem('ageVerified', JSON.stringify(verification));
      onverified({ isAdult: true });
    } else {
      // Redirect to a safe external site
      window.location.href = 'https://www.google.com';
    }
  }
  
  // Prevent background scrolling when modal is open
  function preventScroll(event: Event) {
    event.preventDefault();
  }
  
  // Block escape key and other modal closing attempts
  function handleKeydown(event: KeyboardEvent) {
    // Block escape key for age verification (common security practice)
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
    }
  }
  
  // Prevent right-click context menu during age verification
  function handleContextMenu(event: Event) {
    event.preventDefault();
  }
</script>

<svelte:window onkeydown={handleKeydown} />
<svelte:body onscroll={preventScroll} onwheel={preventScroll} ontouchmove={preventScroll} oncontextmenu={handleContextMenu} />

<!-- Full-screen overlay that cannot be dismissed -->
<div class="age-verification-overlay" role="dialog" aria-labelledby="age-title" aria-describedby="age-description">
  <div class="age-modal">
    <div class="modal-header">
      <h1 id="age-title" class="modal-title">Over 18?</h1>
    </div>
    
    <div class="modal-body">
      <div class="warning-icon">⚠️</div>
      
      <!-- <p id="age-description" class="age-message">
        This website contains mature content that may not be suitable for minors.
      </p> -->
      
      <p class="age-requirement">
        <strong>You must be 18 years or older to access this website.</strong>
      </p>
      
      <!-- <p class="legal-notice">
        By clicking "I am 18 or older", you confirm that:
      </p>
      
      <ul class="confirmation-list">
        <li>You are at least 18 years of age</li>
        <li>You are legally permitted to view mature content in your jurisdiction</li>
        <li>You understand this site may contain adult-oriented material</li>
      </ul> -->
    </div>
    
    <div class="modal-footer">
      <button 
        class="btn-adult" 
        onclick={() => handleVerification(true)}
        type="button"
        aria-describedby="age-description"
      >
        I am 18 or older
      </button>
      
      <button 
        class="btn-minor" 
        onclick={() => handleVerification(false)}
        type="button"
      >
        I am under 18
      </button>
    </div>
    
    <div class="modal-footer-notice">
      <small>This verification will be remembered for 30 days on this device.</small>
    </div>
  </div>
</div>

<style>
  .age-verification-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    backdrop-filter: blur(8px);
  }
  
  .age-modal {
    background: var(--bg-primary, #021123);
    border: 2px solid var(--accent-primary, #fcb342);
    border-radius: 16px;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
    animation: modalAppear 0.3s ease-out;
  }
  
  @keyframes modalAppear {
    from {
      opacity: 0;
      transform: scale(0.9) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  
  .modal-header {
    padding: 2rem 2rem 1rem 2rem;
    text-align: center;
    border-bottom: 1px solid var(--bg-secondary, #232a3a);
  }
  
  .modal-title {
    color: var(--text-accent, #fcb342);
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0;
  }
  
  .modal-body {
    padding: 2rem;
    text-align: center;
  }
  
  .warning-icon {
    font-size: 3rem;
    margin-bottom: 1.5rem;
    display: block;
  }
  
  .age-message {
    font-size: 1.125rem;
    color: var(--text-secondary, #b4c7d9);
    margin-bottom: 1.5rem;
    line-height: 1.6;
  }
  
  .age-requirement {
    font-size: 1.25rem;
    color: var(--text-primary, #ffffff);
    margin-bottom: 1.5rem;
  }
  
  .legal-notice {
    font-size: 1rem;
    color: var(--text-secondary, #b4c7d9);
    margin-bottom: 1rem;
    text-align: left;
  }
  
  .confirmation-list {
    text-align: left;
    color: var(--text-secondary, #b4c7d9);
    margin-bottom: 2rem;
    padding-left: 1.5rem;
  }
  
  .confirmation-list li {
    margin-bottom: 0.5rem;
    line-height: 1.4;
  }
  
  .modal-footer {
    padding: 0 2rem 1rem 2rem;
    display: flex;
    gap: 1rem;
    flex-direction: column;
  }
  
  .btn-adult,
  .btn-minor {
    padding: 1rem 2rem;
    font-size: 1.125rem;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-transform: none;
  }
  
  .btn-adult {
    background: var(--success, #2ecc40);
    color: white;
    order: 1;
  }
  
  .btn-adult:hover {
    background: #27ae37;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(46, 204, 64, 0.3);
  }
  
  .btn-minor {
    background: var(--bg-secondary, #232a3a);
    color: var(--text-secondary, #b4c7d9);
    border: 1px solid var(--bg-secondary, #232a3a);
    order: 2;
  }
  
  .btn-minor:hover {
    background: var(--error, #ff4136);
    color: white;
    transform: translateY(-1px);
  }
  
  .modal-footer-notice {
    padding: 1rem 2rem 2rem 2rem;
    text-align: center;
    color: var(--text-secondary, #b4c7d9);
    opacity: 0.8;
  }
  
  /* Mobile responsiveness */
  @media (max-width: 480px) {
    .age-modal {
      margin: 1rem;
      width: calc(100% - 2rem);
    }
    
    .modal-header,
    .modal-body,
    .modal-footer,
    .modal-footer-notice {
      padding-left: 1.5rem;
      padding-right: 1.5rem;
    }
    
    .modal-title {
      font-size: 1.5rem;
    }
    
    .warning-icon {
      font-size: 2.5rem;
    }
  }
  
  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .age-modal {
      border-width: 3px;
    }
    
    .btn-adult,
    .btn-minor {
      border: 2px solid;
    }
  }
  
  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .age-modal {
      animation: none;
    }
    
    .btn-adult,
    .btn-minor {
      transition: none;
    }
    
    .btn-adult:hover,
    .btn-minor:hover {
      transform: none;
    }
  }
</style>