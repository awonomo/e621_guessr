import { Router } from 'express';
import ScoringService from '../services/ScoringService.js';
import { 
  validateBody,
  scoringGuessSchema,
  bulkScoringSchema 
} from '../middleware/validation.js';
import { scoringRateLimitMiddleware } from '../middleware/rateLimit.js';

const router = Router();

// Apply more lenient rate limiting to scoring endpoints
router.use(scoringRateLimitMiddleware);

/**
 * Score a single tag guess (main endpoint)
 */
router.post('/score', validateBody(scoringGuessSchema), async (req, res) => {
  try {
    const { guess } = req.body;
    
    // Validation is handled by middleware now
    
    const result = await ScoringService.scoreTag(guess);
    res.json(result);
  } catch (error) {
    console.error('Error scoring tag:', error);
    res.status(500).json({ 
      error: 'Failed to score tag',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Score multiple tags in bulk (for round breakdown)
 */
router.post('/bulk', validateBody(bulkScoringSchema), async (req, res) => {
  try {
    const { guesses } = req.body;
    
    // Validation is handled by middleware now
    
    const results = await Promise.all(
      guesses.map(async (guess: string) => {
        try {
          return await ScoringService.scoreTag(guess);
        } catch (error) {
          console.warn(`Failed to score tag "${guess}":`, error);
          return null;
        }
      })
    );
    
    // Filter out failed results
    const validResults = results.filter(result => result !== null);
    
    res.json({ 
      results: validResults,
      successful: validResults.length,
      total: guesses.length
    });
  } catch (error) {
    console.error('Error in bulk scoring:', error);
    res.status(500).json({ 
      error: 'Failed to score tags',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Health check for scoring service
 */
router.get('/health', async (req, res) => {
  try {
    // Test scoring with a common tag
    const testResult = await ScoringService.scoreTag('test');
    res.json({ 
      status: 'ok',
      message: 'Scoring service is operational'
    });
  } catch (error) {
    console.error('Scoring service health check failed:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Scoring service unavailable'
    });
  }
});

/**
 * Debug endpoint to see detailed scoring breakdown
 */
router.post('/debug-score', validateBody(scoringGuessSchema), async (req, res) => {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  try {
    const { guess } = req.body;
    
    // Validation is handled by middleware now
    
    // Get the actual scoring result
    const result = await ScoringService.scoreTag(guess);
    
    // Import multiplier functions for detailed breakdown
    const { getTagMultiplier, getContextualMultiplier, getTagMultiplierBreakdown } = await import('../config/multipliers.js');
    
    if (result.actualTag) {
      const manualMultiplier = getTagMultiplier(result.actualTag);
      const contextualMultiplier = getContextualMultiplier(result.actualTag, result.category);
      const breakdown = getTagMultiplierBreakdown(result.actualTag, result.category);
      
      res.json({
        ...result,
        debug: {
          manualMultiplier,
          contextualMultiplier,
          breakdown
        }
      });
    } else {
      res.json({
        ...result,
        debug: {
          message: 'Tag not found in database'
        }
      });
    }
  } catch (error) {
    console.error('Error in debug scoring:', error);
    res.status(500).json({ 
      error: 'Failed to debug score tag',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;