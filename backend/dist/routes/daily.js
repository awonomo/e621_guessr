import express from 'express';
import { createError } from '../middleware/errorHandler.js';
const router = express.Router();
// Simple in-memory storage for daily challenges (use database in production)
const dailyChallenges = new Map();
// Helper to get today's date string
function getTodayString() {
    return new Date().toISOString().split('T')[0];
}
// GET /api/daily - Get today's daily challenge
router.get('/', async (req, res, next) => {
    try {
        const today = getTodayString();
        let challenge = dailyChallenges.get(today);
        if (!challenge) {
            // Generate new daily challenge if none exists
            challenge = await generateDailyChallenge(today);
            dailyChallenges.set(today, challenge);
        }
        res.json({
            success: true,
            data: challenge
        });
    }
    catch (error) {
        next(error);
    }
});
// GET /api/daily/:date - Get daily challenge for specific date
router.get('/:date', async (req, res, next) => {
    try {
        const dateParam = req.params.date;
        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
            throw createError('Invalid date format. Use YYYY-MM-DD', 400);
        }
        let challenge = dailyChallenges.get(dateParam);
        if (!challenge) {
            // Generate challenge for requested date if it doesn't exist
            challenge = await generateDailyChallenge(dateParam);
            dailyChallenges.set(dateParam, challenge);
        }
        res.json({
            success: true,
            data: challenge
        });
    }
    catch (error) {
        next(error);
    }
});
// Helper function to generate a daily challenge
async function generateDailyChallenge(date) {
    try {
        // Use date as seed for consistent daily content
        const dateHash = hashCode(date);
        // Fixed settings for daily challenges
        const settings = {
            timeLimit: 120, // 2 minutes per round
            totalRounds: 5,
            ratings: ['safe', 'questionable'],
            minUpvotes: 100,
            customCriteria: ''
        };
        // Generate consistent tags for the day using date hash
        const dailyTags = generateDailyTags(dateHash);
        // Fetch posts for daily challenge
        const postsResponse = await fetch(`http://localhost:3001/api/posts?tags=${encodeURIComponent(dailyTags)}&limit=5&ratings=safe,questionable&minScore=100`);
        if (!postsResponse.ok) {
            throw createError('Failed to generate daily challenge posts', 500);
        }
        const postsData = await postsResponse.json();
        if (!postsData.success || !postsData.data?.posts) {
            throw createError('No posts available for daily challenge', 500);
        }
        const challenge = {
            id: `daily-${date}`,
            date,
            posts: postsData.data.posts,
            settings: {
                ...settings,
                ratings: [...settings.ratings]
            },
            participants: 0,
            topScore: 0
        };
        return challenge;
    }
    catch (error) {
        console.error('Failed to generate daily challenge:', error);
        throw createError('Failed to generate daily challenge', 500);
    }
}
// Simple hash function for date-based seeding
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}
// Generate consistent daily tags based on date hash
function generateDailyTags(seed) {
    const tagPools = [
        ['cat', 'dog', 'wolf', 'fox', 'rabbit'],
        ['forest', 'beach', 'mountain', 'city', 'space'],
        ['happy', 'peaceful', 'adventure', 'mystery', 'friendship'],
        ['digital_art', 'traditional_art', 'photography', 'sketch'],
        ['portrait', 'landscape', 'abstract', 'realistic']
    ];
    const selectedTags = [];
    // Use seed to select one tag from each pool
    tagPools.forEach((pool, index) => {
        const poolSeed = seed + index;
        const tagIndex = poolSeed % pool.length;
        selectedTags.push(pool[tagIndex]);
    });
    return selectedTags.join(' ');
}
export { router as dailyRouter };
//# sourceMappingURL=daily.js.map