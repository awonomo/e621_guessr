import { Router } from 'express';
import ScoringService from '../services/ScoringService.js';

const router = Router();

/**
 * Score a single tag guess (main endpoint)
 */
router.post('/score', async (req, res) => {
  try {
    const { guess } = req.body;
    
    if (!guess || typeof guess !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Guess must be a non-empty string'
      });
    }
    
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
router.post('/bulk', async (req, res) => {
  try {
    const { guesses } = req.body;
    
    if (!Array.isArray(guesses) || guesses.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Guesses must be a non-empty array of strings'
      });
    }

    // Limit to prevent abuse
    if (guesses.length > 2000) {
      return res.status(400).json({ 
        error: 'Too many guesses',
        message: 'Maximum 2000 tags per bulk request'
      });
    }
    
    const results = await Promise.all(
      guesses.map(async (guess) => {
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

export default router;