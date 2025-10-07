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
    }
    catch (error) {
        console.error('Error scoring tag:', error);
        res.status(500).json({
            error: 'Failed to score tag',
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
    }
    catch (error) {
        console.error('Scoring service health check failed:', error);
        res.status(500).json({
            status: 'error',
            message: 'Scoring service unavailable'
        });
    }
});
export default router;
//# sourceMappingURL=scoring.js.map