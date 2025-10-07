import express from 'express';
import { createError } from '../middleware/errorHandler.js';
const router = express.Router();
// Simple in-memory storage for stats (use database in production)
const gameStats = new Map();
const leaderboards = new Map();
// POST /api/stats/session - Submit game session results
router.post('/session', async (req, res, next) => {
    try {
        // In a real app, you'd validate the session data more thoroughly
        const session = req.body;
        if (!session.sessionId || !session.totalScore || !Array.isArray(session.rounds)) {
            throw createError('Invalid session data', 400);
        }
        // Store session results (in production, save to database)
        const sessionKey = `session_${session.sessionId}`;
        gameStats.set(sessionKey, {
            ...session,
            submittedAt: new Date().toISOString()
        });
        // Update daily leaderboard if this was a daily challenge
        if (session.sessionId.includes('daily')) {
            const today = new Date().toISOString().split('T')[0];
            const dailyKey = `daily_${today}`;
            if (!leaderboards.has(dailyKey)) {
                leaderboards.set(dailyKey, []);
            }
            const dailyLeaderboard = leaderboards.get(dailyKey);
            dailyLeaderboard.push({
                sessionId: session.sessionId,
                score: session.totalScore,
                completedAt: session.completedAt
            });
            // Keep top 10 scores
            dailyLeaderboard.sort((a, b) => b.score - a.score);
            if (dailyLeaderboard.length > 10) {
                dailyLeaderboard.splice(10);
            }
        }
        res.json({
            success: true,
            message: 'Session results recorded'
        });
    }
    catch (error) {
        next(error);
    }
});
// GET /api/stats/leaderboard/:date? - Get leaderboard for date or today
router.get('/leaderboard/:date?', async (req, res, next) => {
    try {
        const date = req.params.date || new Date().toISOString().split('T')[0];
        const dailyKey = `daily_${date}`;
        const leaderboard = leaderboards.get(dailyKey) || [];
        res.json({
            success: true,
            data: {
                date,
                scores: leaderboard
            }
        });
    }
    catch (error) {
        next(error);
    }
});
// GET /api/stats/global - Get global statistics
router.get('/global', async (req, res, next) => {
    try {
        // Calculate global stats from stored sessions
        const allSessions = Array.from(gameStats.values());
        const totalSessions = allSessions.length;
        const averageScore = totalSessions > 0
            ? allSessions.reduce((sum, session) => sum + session.totalScore, 0) / totalSessions
            : 0;
        const highestScore = totalSessions > 0
            ? Math.max(...allSessions.map(session => session.totalScore))
            : 0;
        res.json({
            success: true,
            data: {
                totalGamesPlayed: totalSessions,
                averageScore: Math.round(averageScore),
                highestScore,
                activePlayers: new Set(allSessions.map(session => session.sessionId)).size
            }
        });
    }
    catch (error) {
        next(error);
    }
});
export { router as statsRouter };
//# sourceMappingURL=stats.js.map