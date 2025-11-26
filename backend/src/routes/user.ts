import { Router } from 'express';
import { z } from 'zod';
import db from '../database/connection.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Validation schema for stats migration  
const migrateStatsSchema = z.object({
  gamesPlayed: z.number().min(0),
  totalScore: z.union([z.number(), z.string()]).transform((val) => typeof val === 'string' ? parseInt(val, 10) : val).pipe(z.number().min(0)),
  averageScore: z.number().min(0),
  bestScore: z.number().min(0),
  totalTagsGuessed: z.number().min(0),
  accuracyRate: z.number().min(0).max(100), // Allow 0-100 percentage
  dailyChallengesCompleted: z.number().min(0),
  bestTag: z.object({
    tag: z.string(),
    category: z.string(),
    score: z.number()
  }).nullable()
}).strict(); // Add strict mode to reject extra fields like favoriteCategories

/**
 * POST /api/user/migrate-stats
 * Migrate localStorage stats to user account
 */
router.post('/migrate-stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    console.log(`📊 Migration request from user ${userId}:`, req.body);
    console.log(`📊 Request body type check:`, {
      gamesPlayed: typeof req.body.gamesPlayed,
      totalScore: typeof req.body.totalScore,
      averageScore: typeof req.body.averageScore,
      bestScore: typeof req.body.bestScore,
      totalTagsGuessed: typeof req.body.totalTagsGuessed,
      accuracyRate: typeof req.body.accuracyRate,
      dailyChallengesCompleted: typeof req.body.dailyChallengesCompleted,
      bestTag: typeof req.body.bestTag
    });
    
    // Validate incoming stats data
    const validatedStats = migrateStatsSchema.parse(req.body);

    // Check if user already has stats (avoid overwriting)
    const existingStats = await db.query(
      'SELECT * FROM user_stats WHERE user_id = $1',
      [userId]
    );

    if (existingStats.rows.length === 0) {
      return res.status(404).json({
        error: 'User stats not found',
        message: 'User stats record should be created during registration'
      });
    }

    const currentStats = existingStats.rows[0];
    
    // Only migrate if current stats are empty/minimal (new account)
    // This prevents overwriting existing progress
    const shouldMigrate = 
      currentStats.games_played === 0 && 
      currentStats.total_score === 0 && 
      currentStats.daily_challenges_completed === 0;

    if (!shouldMigrate) {
      return res.json({
        success: true,
        message: 'Stats already exist - migration skipped',
        migrated: false
      });
    }

    // Calculate average score for new stats
    const averageScore = validatedStats.gamesPlayed > 0 
      ? validatedStats.totalScore / validatedStats.gamesPlayed 
      : 0;

    // Migrate localStorage stats to user account
    await db.query(`
      UPDATE user_stats 
      SET 
        games_played = $2,
        total_score = $3,
        best_score = $4,
        average_score = $5,
        total_tags_guessed = $6,
        accuracy_rate = $7,
        daily_challenges_completed = $8,
        best_tag = $9,
        updated_at = NOW()
      WHERE user_id = $1
    `, [
      userId,
      validatedStats.gamesPlayed,
      validatedStats.totalScore,
      validatedStats.bestScore,
      averageScore,
      validatedStats.totalTagsGuessed,
      validatedStats.accuracyRate,
      validatedStats.dailyChallengesCompleted,
      validatedStats.bestTag ? JSON.stringify(validatedStats.bestTag) : null
    ]);

    console.log(`📊 Migrated stats for user ${req.user!.username} (${validatedStats.gamesPlayed} games)`);

    res.json({
      success: true,
      message: 'Stats migrated successfully!',
      migrated: true,
      stats: {
        gamesPlayed: validatedStats.gamesPlayed,
        totalScore: validatedStats.totalScore,
        bestScore: validatedStats.bestScore
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('📊 Migration validation error:', error.errors);
      return res.status(400).json({
        error: 'Invalid stats data',
        message: 'Stats data format is invalid',
        details: error.errors
      });
    }

    console.error('📊 Migration database error:', error);
    res.status(500).json({
      error: 'Migration failed',
      message: 'Could not migrate stats to user account'
    });
  }
});

/**
 * GET /api/user/stats
 * Get user's current stats from database
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    console.log(`📊 Getting stats for user ID: ${userId}`);

    // First, let's check if the user exists at all
    const userCheck = await db.query('SELECT id, username FROM users WHERE id = $1', [userId]);
    console.log(`📊 User existence check: ${userCheck.rows.length} rows`);
    if (userCheck.rows.length > 0) {
      console.log(`📊 User found:`, userCheck.rows[0]);
    }

    let result = await db.query(`
      SELECT 
        games_played,
        total_score,
        best_score,
        average_score,
        total_tags_guessed,
        accuracy_rate,
        daily_challenges_completed,
        best_tag,
        updated_at
      FROM user_stats 
      WHERE user_id = $1
    `, [userId]);

    console.log(`📊 Query result: ${result.rows.length} rows found`);
    if (result.rows.length > 0) {
      console.log(`📊 Row data:`, result.rows[0]);
    }

    // If no stats exist, create initial empty stats
    if (result.rows.length === 0) {
      console.log(`📊 Creating initial stats for user ${userId}`);
      await db.query(`
        INSERT INTO user_stats (user_id) VALUES ($1)
      `, [userId]);

      // Re-query to get the newly created stats
      result = await db.query(`
        SELECT 
          games_played,
          total_score,
          best_score,
          average_score,
          total_tags_guessed,
          accuracy_rate,
          daily_challenges_completed,
          best_tag,
          updated_at
        FROM user_stats 
        WHERE user_id = $1
      `, [userId]);
      
      console.log(`📊 After creation - rows: ${result.rows.length}`);
    }

    const row = result.rows[0];
    console.log(`📊 Processing row:`, row);
    console.log(`📊 Raw best_tag from database:`, row.best_tag);
    console.log(`📊 best_tag type:`, typeof row.best_tag);
    
    // JSONB columns are already parsed by PostgreSQL driver - no need to JSON.parse()
    const bestTag = row.best_tag || null;
    console.log(`📊 Final bestTag:`, bestTag);

    const stats = {
      gamesPlayed: row.games_played,
      totalScore: row.total_score,
      averageScore: parseFloat(row.average_score) || 0,
      bestScore: row.best_score,
      totalTagsGuessed: row.total_tags_guessed,
      accuracyRate: parseFloat(row.accuracy_rate) || 0,
      dailyChallengesCompleted: row.daily_challenges_completed,
      favoriteCategories: [], // Empty array since we removed this feature
      bestTag
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      error: 'Failed to get stats',
      message: 'Could not retrieve user stats'
    });
  }
});

/**
 * POST /api/user/update-stats
 * Update user stats after a game session
 */
router.post('/update-stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // This will be called by the game store when a game session ends
    // to update the user's stats in the database
    const validatedStats = migrateStatsSchema.parse(req.body);

    // Calculate average score
    const averageScore = validatedStats.gamesPlayed > 0 
      ? validatedStats.totalScore / validatedStats.gamesPlayed 
      : 0;

    await db.query(`
      UPDATE user_stats 
      SET 
        games_played = $2,
        total_score = $3,
        best_score = $4,
        average_score = $5,
        total_tags_guessed = $6,
        accuracy_rate = $7,
        daily_challenges_completed = $8,
        best_tag = $9,
        updated_at = NOW()
      WHERE user_id = $1
    `, [
      userId,
      validatedStats.gamesPlayed,
      validatedStats.totalScore,
      validatedStats.bestScore,
      averageScore,
      validatedStats.totalTagsGuessed,
      validatedStats.accuracyRate,
      validatedStats.dailyChallengesCompleted,
      validatedStats.bestTag ? JSON.stringify(validatedStats.bestTag) : null
    ]);

    res.json({
      success: true,
      message: 'Stats updated successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid stats data',
        message: 'Stats data format is invalid',
        details: error.errors.map(e => e.message)
      });
    }

    console.error('Update user stats error:', error);
    res.status(500).json({
      error: 'Update failed',
      message: 'Failed to update user stats'
    });
  }
});

export default router;