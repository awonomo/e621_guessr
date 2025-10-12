import { Router } from 'express';
import TagDataManager from '../services/TagDataManager.js';
import db from '../database/connection.js';
import { 
  validateParams,
  tagSearchParamsSchema 
} from '../middleware/validation.js';

const router = Router();

/**
 * Trigger tag data refresh
 */
router.post('/refresh', async (req, res) => {
  try {
    // This is a long-running operation, so we'll run it in the background
    TagDataManager.refreshTagData()
      .then(() => {
        console.log('✅ Tag data refresh completed successfully');
      })
      .catch((error) => {
        console.error('❌ Tag data refresh failed:', error);
      });
    
    res.json({ 
      message: 'Tag data refresh started in background. Check server logs for progress.'
    });
  } catch (error) {
    console.error('Error starting tag refresh:', error);
    res.status(500).json({ 
      error: 'Failed to start tag refresh',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Search for a specific tag
 */
router.get('/search/:query', validateParams(tagSearchParamsSchema), async (req, res) => {
  try {
    const { query } = req.params;
    
    // Validation is handled by middleware now
    
    const tag = await TagDataManager.findTag(query);
    
    if (!tag) {
      return res.status(404).json({ 
        error: 'Tag not found',
        message: `No tag found matching "${query}"`
      });
    }
    
    res.json(tag);
  } catch (error) {
    console.error('Error searching for tag:', error);
    res.status(500).json({ 
      error: 'Failed to search for tag',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get tag refresh status and history
 */
router.get('/refresh/status', async (req, res) => {
  try {
    // Get the last 10 refresh attempts
    const refreshHistory = await db.query(`
      SELECT 
        refresh_date,
        tags_processed,
        aliases_processed,
        duration_seconds,
        status,
        error_message,
        created_at
      FROM tag_refresh_log
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    // Get current tag count
    const tagStats = await db.query(`
      SELECT 
        COUNT(*) as total_tags,
        COUNT(CASE WHEN category = 'general' THEN 1 END) as general_tags,
        COUNT(CASE WHEN category = 'artist' THEN 1 END) as artist_tags,
        COUNT(CASE WHEN category = 'copyright' THEN 1 END) as copyright_tags,
        COUNT(CASE WHEN category = 'character' THEN 1 END) as character_tags,
        COUNT(CASE WHEN category = 'species' THEN 1 END) as species_tags,
        COUNT(CASE WHEN category = 'meta' THEN 1 END) as meta_tags,
        MAX(last_updated) as last_updated
      FROM tags
    `);
    
    const aliasStats = await db.query(`
      SELECT COUNT(*) as total_aliases
      FROM tag_aliases
      WHERE status = 'active'
    `);
    
    res.json({
      refreshHistory: refreshHistory.rows,
      currentStats: {
        ...tagStats.rows[0],
        total_aliases: aliasStats.rows[0].total_aliases
      }
    });
  } catch (error) {
    console.error('Error getting refresh status:', error);
    res.status(500).json({ 
      error: 'Failed to get refresh status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;