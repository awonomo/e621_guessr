import { Router } from 'express';
import db from '../database/connection.js';
import { 
  validateBody,
  adminTagSchema,
  bulkAdminSchema 
} from '../middleware/validation.js';
import { schedulerService } from '../services/SchedulerService.js';

const router = Router();

// Simple admin authentication middleware
const adminAuth = (req: any, res: any, next: any) => {
  const adminKey = req.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_KEY;
  
  if (!expectedKey) {
    return res.status(500).json({
      error: 'Admin functionality not configured',
      message: 'ADMIN_KEY environment variable not set'
    });
  }
  
  if (adminKey !== expectedKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid admin key'
    });
  }
  
  next();
};

/**
 * GET /api/admin/blacklist - Get all daily challenge blacklisted tags
 */
router.get('/blacklist', adminAuth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, tag, created_at FROM daily_blacklist_tags ORDER BY tag'
    );
    
    res.json({
      success: true,
      tags: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching blacklist:', error);
    res.status(500).json({
      error: 'Failed to fetch blacklist',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/blacklist - Add a new tag to daily challenge blacklist
 */
router.post('/blacklist', adminAuth, validateBody(adminTagSchema), async (req, res) => {
  try {
    const { tag } = req.body;
    
    // Validation is handled by middleware now
    
    const normalizedTag = tag.trim().toLowerCase();
    
    await db.query(
      'INSERT INTO daily_blacklist_tags (tag) VALUES ($1)',
      [normalizedTag]
    );
    
    res.json({
      success: true,
      message: `Tag "${normalizedTag}" added to daily challenge blacklist`
    });
    
  } catch (error: any) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        error: 'Tag already exists',
        message: 'This tag is already in the daily challenge blacklist'
      });
    }
    
    console.error('Error adding blacklisted tag:', error);
    res.status(500).json({
      error: 'Failed to add tag',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/admin/blacklist/:id - Remove a tag from daily challenge blacklist by ID
 */
router.delete('/blacklist/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Valid tag ID is required'
      });
    }
    
    const result = await db.query(
      'DELETE FROM daily_blacklist_tags WHERE id = $1 RETURNING tag',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Tag not found',
        message: 'No tag found with the specified ID'
      });
    }
    
    res.json({
      success: true,
      message: `Tag "${result.rows[0].tag}" removed from daily challenge blacklist`
    });
    
  } catch (error) {
    console.error('Error removing blacklisted tag:', error);
    res.status(500).json({
      error: 'Failed to remove tag',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/admin/blacklist/tag/:tag - Remove a tag from daily challenge blacklist by name
 */
router.delete('/blacklist/tag/:tag', adminAuth, async (req, res) => {
  try {
    const { tag } = req.params;
    
    if (!tag) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Tag name is required'
      });
    }
    
    const normalizedTag = decodeURIComponent(tag).trim().toLowerCase();
    
    const result = await db.query(
      'DELETE FROM daily_blacklist_tags WHERE tag = $1 RETURNING id',
      [normalizedTag]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Tag not found',
        message: 'No tag found with the specified name'
      });
    }
    
    res.json({
      success: true,
      message: `Tag "${normalizedTag}" removed from daily challenge blacklist`
    });
    
  } catch (error) {
    console.error('Error removing blacklisted tag:', error);
    res.status(500).json({
      error: 'Failed to remove tag',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/admin/blacklist/bulk - Bulk operations for daily challenge blacklist (add/remove multiple tags)
 */
router.put('/blacklist/bulk', adminAuth, validateBody(bulkAdminSchema), async (req, res) => {
  try {
    const { action, tags } = req.body;
    
    // Validation is handled by middleware now
    
    const normalizedTags = tags.map((tag: string) => tag.trim().toLowerCase());
    
    let result;
    if (action === 'add') {
      const placeholders = normalizedTags.map((_: string, i: number) => `($${i + 1})`).join(',');
      result = await db.query(
        `INSERT INTO daily_blacklist_tags (tag) VALUES ${placeholders} ON CONFLICT (tag) DO NOTHING RETURNING tag`,
        normalizedTags
      );
    } else {
      const placeholders = normalizedTags.map((_: string, i: number) => `$${i + 1}`).join(',');
      result = await db.query(
        `DELETE FROM daily_blacklist_tags WHERE tag IN (${placeholders}) RETURNING tag`,
        normalizedTags
      );
    }
    
    res.json({
      success: true,
      action,
      processed: result.rows.length,
      tags: result.rows.map((row: { tag: string }) => row.tag)
    });
    
  } catch (error) {
    console.error('Error in bulk blacklist operation:', error);
    res.status(500).json({
      error: 'Bulk operation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/scheduler/status
 * Get scheduler status and next scheduled refresh time
 */
router.get('/scheduler/status', adminAuth, (req, res) => {
  try {
    const nextRefresh = schedulerService.getNextRefreshTime();
    
    res.json({
      success: true,
      scheduler: {
        running: true,
        nextRefresh: nextRefresh.toISOString(),
        nextRefreshLocal: nextRefresh.toLocaleString('en-US', { 
          timeZone: 'America/Chicago',
          dateStyle: 'full',
          timeStyle: 'short'
        })
      }
    });
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    res.status(500).json({
      error: 'Failed to get scheduler status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/scheduler/trigger-refresh
 * Manually trigger a tag data refresh
 */
router.post('/scheduler/trigger-refresh', adminAuth, async (req, res) => {
  try {
    // Trigger refresh in background
    schedulerService.triggerTagRefresh().catch(error => {
      console.error('Background tag refresh failed:', error);
    });
    
    res.json({
      success: true,
      message: 'Tag refresh triggered successfully',
      note: 'Refresh is running in the background. Check logs for progress.'
    });
  } catch (error) {
    console.error('Error triggering tag refresh:', error);
    res.status(500).json({
      error: 'Failed to trigger tag refresh',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;