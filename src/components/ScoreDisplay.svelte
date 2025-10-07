<script lang="ts">
  import { onMount } from 'svelte';
  
  export let score: number = 0;
  
  let displayScore = 0;
  let lastTargetScore = 0;
  let isAnimating = false;
  
  // Animate score changes only when the target score actually changes
  $: if (score !== lastTargetScore && !isAnimating) {
    animateScore(score);
  }
  
  function animateScore(targetScore: number) {
    if (isAnimating) return;
    
    lastTargetScore = targetScore; // Track the target we're animating to
    isAnimating = true;
    const startScore = displayScore;
    const difference = targetScore - startScore;
    const duration = Math.min(1000, Math.abs(difference) * 2); // Max 1 second
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      displayScore = Math.floor(startScore + (difference * easedProgress));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        displayScore = targetScore;
        isAnimating = false;
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  // Calculate text size based on number of digits - made larger
  $: digitCount = displayScore.toString().length;
  $: fontSize = Math.max(2.5, 5.5 - (digitCount * 0.2)); // Scale down as numbers get longer
</script>

<div class="score-display" class:glowing={isAnimating}>
  <div class="score-label">Score</div>
  <div 
    class="score-number"
    style="font-size: {fontSize}rem;"
  >
    {displayScore.toLocaleString()}
  </div>
</div>

<style>
  .score-display {
    text-align: center;
    margin-bottom: 2rem;
  }
  
  .score-label {
    color: var(--text-secondary);
    font-size: 1.125rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 0.5rem;
  }
  
  .score-number {
    color: var(--text-accent);
    font-weight: 900;
    line-height: 1;
    text-shadow: 0 2px 8px rgba(252, 179, 66, 0.3);
    transition: all 0.3s ease;
    font-variant-numeric: tabular-nums;
  }
  
  .score-display.glowing .score-number {
    text-shadow: 
      0 0 10px rgba(252, 179, 66, 0.8),
      0 0 20px rgba(252, 179, 66, 0.6),
      0 0 30px rgba(252, 179, 66, 0.4),
      0 2px 8px rgba(252, 179, 66, 0.3);
    transform: scale(1.05);
  }
  
  /* Responsive font sizing */
  @media (max-width: 768px) {
    .score-number {
      font-size: 3rem !important;
    }
    
    .score-label {
      font-size: 1rem;
    }
  }
</style>