import { Router } from 'express';
import db from '../database/connection.js';
import { ScoringService } from '../services/ScoringService.js';
import { E621Post, PostsQuery } from '../types.js';
import { checkPostAgainstBlacklist } from '../utils/blacklist.js';
import { 
  validate, 
  validateParams, 
  validateQuery, 
  validateBody,
  dailyParamsSchema, 
  dailySubmissionSchema, 
  dailyStatusSchema 
} from '../middleware/validation.js';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { join } from 'path';

// Get version from package.json
const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
const VERSION = packageJson.version;

// E621 API configuration
const E621_USER_AGENT = `e621_guessr/${VERSION} (https://github.com/awonomo/e621_guessr)`;

const router = Router();

interface DailyChallenge {
  date: string;
  posts: E621Post[];
  created_at: string;
}

interface DailyResult {
  player_name: string;
  score: number;
  completed_at: string;
}

// Cache for daily challenge blacklisted tags (fetched from database)
let DAILY_BLACKLIST: string[] = [];
let blacklistLastFetched = 0;
const BLACKLIST_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch daily challenge blacklisted tags from database with caching
 */
async function getBlacklistedTags(): Promise<string[]> {
  const now = Date.now();
  
  // Return cached version if still fresh
  if (DAILY_BLACKLIST.length > 0 && (now - blacklistLastFetched) < BLACKLIST_CACHE_TTL) {
    return DAILY_BLACKLIST;
  }
  
  try {
    const result = await db.query('SELECT tag FROM daily_blacklist_tags ORDER BY tag');
    DAILY_BLACKLIST = result.rows.map((row: { tag: string }) => row.tag);
    blacklistLastFetched = now;
    
    console.log(`📋 Loaded ${DAILY_BLACKLIST.length} daily challenge blacklisted tags from database`);
    return DAILY_BLACKLIST;
  } catch (error) {
    console.error('Error fetching daily challenge blacklisted tags:', error);
    // Fall back to empty array if database fails
    return [];
  }
}

// Helper function to build E621 query for daily challenges
function buildDailyE621Query(minPostScore: number): string {
  const tags: string[] = [];

  // Always start with order:random for games
  tags.push('order:random');

  // Minimum score for post quality
  if (minPostScore > 0) {
    tags.push(`score:>=${minPostScore}`);
  }
  // Minimum tag count for game quality (50+ tags)
  tags.push('tagcount:>=50');
  // filetype restrictions
  tags.push('-type:mp4');
  tags.push('-type:webm');
  tags.push('-type:swf');

  return tags.join(' ');
}

const DAILY_CONFIG = {
  ROUNDS: 5,
  TIME_LIMIT: 120, // 2 minutes in seconds
  MIN_POST_SCORE: 400 // Minimum post score for quality
};

/**
 * Get current date in CST timezone (YYYY-MM-DD format)
 * This ensures consistency between date column and created_at timestamp
 */
function getTodayInCST(): string {
  const now = new Date();
  const cstOffset = -6; // CST is UTC-6
  const cstTime = new Date(now.getTime() + (cstOffset * 60 * 60 * 1000));
  return cstTime.toISOString().split('T')[0]; // YYYY-MM-DD format
}

/**
 * Get or generate daily challenge for a specific date
 */
router.get('/:date', validateParams(dailyParamsSchema), async (req, res) => {
  try {
    const { date } = req.params;
    
    // Date validation is handled by middleware now
    
    // Check if daily challenge already exists
    const existingChallenge = await getDailyChallenge(date);
    if (existingChallenge) {
      return res.json({
        date,
        posts: existingChallenge.posts,
        config: DAILY_CONFIG
      });
    }

    // Generate new daily challenge
    const posts = await generateDailyChallenge();
    const challenge = await saveDailyChallenge(date, posts);
    
    res.json({
      date,
      posts: challenge.posts,
      config: DAILY_CONFIG
    });

  } catch (error) {
    console.error('Error getting daily challenge:', error);
    res.status(500).json({
      error: 'Failed to get daily challenge',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/daily/:date/status - Check if player has completed today's challenge
router.get('/:date/status', validateParams(dailyParamsSchema), validateQuery(dailyStatusSchema), async (req, res) => {
  try {
    const { date } = req.params;
    const { player_name } = req.query as { player_name: string };

    // Validation is handled by middleware now

    // Check if player already submitted for this date
    const existingSubmission = await checkPlayerSubmission(date, player_name);
    
    if (existingSubmission) {
      // Get the player's result
      const result = await db.query(
        'SELECT score, rounds, completed_at FROM daily_results WHERE date = $1 AND player_name = $2',
        [date, player_name]
      );

      // Handle rounds data - it might already be parsed or need parsing
      let rounds = result.rows[0].rounds;
      if (typeof rounds === 'string') {
        rounds = JSON.parse(rounds);
      }

      // Also get the challenge data to avoid a second API call
      const challengeData = await getDailyChallenge(date);
      
      return res.json({
        completed: true,
        result: {
          score: result.rows[0].score,
          rounds: rounds,
          completed_at: result.rows[0].completed_at
        },
        // Include challenge data to avoid second API call
        challenge: challengeData ? {
          date: challengeData.date,
          posts: challengeData.posts,
          config: DAILY_CONFIG
        } : null
      });
    }

    res.json({ completed: false });

  } catch (error) {
    console.error('Error checking daily challenge status:', error);
    res.status(500).json({
      error: 'Failed to check status',
      message: 'Internal server error'
    });
  }
});

/**
 * Submit daily challenge result
 */
router.post('/:date/submit', validateParams(dailyParamsSchema), validateBody(dailySubmissionSchema), async (req, res) => {
  try {
    const { date } = req.params;
    const { player_name, score, rounds } = req.body;

    // Validation is handled by middleware now

    // Check if player already submitted for this date
    const existingSubmission = await checkPlayerSubmission(date, player_name);
    if (existingSubmission) {
      return res.status(409).json({
        error: 'Already submitted',
        message: 'Player has already submitted a result for this date'
      });
    }

    // Verify daily challenge exists
    const challenge = await getDailyChallenge(date);
    if (!challenge) {
      return res.status(404).json({
        error: 'Challenge not found',
        message: 'Daily challenge for this date does not exist'
      });
    }

    // Save result
    await saveDailyResult(date, player_name, score, rounds);

    res.json({
      success: true,
      message: 'Daily challenge result saved'
    });

  } catch (error) {
    console.error('Error submitting daily result:', error);
    res.status(500).json({
      error: 'Failed to submit result',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/daily/:date - Clear daily challenge (for debugging)
router.delete('/:date', validateParams(dailyParamsSchema), async (req, res) => {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  try {
    const { date } = req.params;
    
    await db.query('DELETE FROM daily_challenges WHERE date = $1', [date]);
    await db.query('DELETE FROM daily_results WHERE date = $1', [date]);
    
    res.json({ success: true, message: `Daily challenge for ${date} cleared` });
  } catch (error) {
    console.error('Error clearing daily challenge:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to clear daily challenge'
    });
  }
});

/**
 * Get daily challenge from database
 */
async function getDailyChallenge(date: string): Promise<DailyChallenge | null> {
  const result = await db.query(
    'SELECT * FROM daily_challenges WHERE date = $1',
    [date]
  );
  
  if (result.rows.length === 0) {
    return null;
  }

  console.log('Raw posts data from database:', result.rows[0].posts);
  console.log('Posts data type:', typeof result.rows[0].posts);
  console.log('First 100 chars:', result.rows[0].posts?.toString().substring(0, 100));

  return {
    date: result.rows[0].date,
    posts: result.rows[0].posts,
    created_at: result.rows[0].created_at
  };
}

/**
 * Generate new daily challenge by fetching posts from e621
 */
async function generateDailyChallenge(): Promise<E621Post[]> {
  const validPosts: E621Post[] = [];
  const maxAttempts = 50; // Prevent infinite loops
  let attempts = 0;

  // Build query with minimum score and other filters
  const queryTags = buildDailyE621Query(DAILY_CONFIG.MIN_POST_SCORE);
  console.log('🔍 Daily challenge query:', queryTags);

  while (validPosts.length < DAILY_CONFIG.ROUNDS && attempts < maxAttempts) {
    attempts++;
    
    try {
      // Fetch random post from e621 API using proper query
      const apiUrl = `https://e621.net/posts.json?tags=${encodeURIComponent(queryTags)}&limit=1`;
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': E621_USER_AGENT
        }
      });

      if (!response.ok) {
        throw new Error(`E621 API error: ${response.status}`);
      }

      const data = await response.json() as { posts: E621Post[] };
      
      if (!data.posts || data.posts.length === 0) {
        continue;
      }

      const post = data.posts[0];
      
      // Check if post passes blacklist
      if (await passesBlacklist(post)) {
        console.log('Valid post found:', post.id, '(' + (validPosts.length + 1) + '/' + DAILY_CONFIG.ROUNDS + ')');
        validPosts.push(post); // Use the full E621Post object directly
      } else {
        console.log('✗ Post', post.id, 'contains blacklisted tags');
      }
      
    } catch (error) {
      console.error('Error fetching post from e621:', error);
      // Continue trying with remaining attempts
    }
  }

  if (validPosts.length < DAILY_CONFIG.ROUNDS) {
    throw new Error(`Could not generate enough valid posts. Got ${validPosts.length}/${DAILY_CONFIG.ROUNDS}`);
  }

  return validPosts;
}

/**
 * Check if a post passes the daily challenge blacklist filter
 */
async function passesBlacklist(post: any): Promise<boolean> {
  const blacklistedTags = await getBlacklistedTags();
  return checkPostAgainstBlacklist(post, blacklistedTags);
}

/**
 * Save daily challenge to database
 */
async function saveDailyChallenge(date: string, posts: E621Post[]): Promise<DailyChallenge> {
  console.log('Saving daily challenge with', posts.length, 'posts');
  
  const postsJson = JSON.stringify(posts);
  console.log('JSON serialized successfully, length:', postsJson.length);
  
  try {
    // NOW() will use the database timezone (America/Chicago)
    const result = await db.query(
      'INSERT INTO daily_challenges (date, posts, created_at) VALUES ($1, $2, NOW()) RETURNING date, created_at',
      [date, postsJson]
    );

    // Return the challenge using the original posts parameter (no need to re-parse from DB)
    return {
      date: result.rows[0].date,
      posts: posts,
      created_at: result.rows[0].created_at
    };
  } catch (error) {
    console.error('Error saving daily challenge:', error);
    throw error;
  }
}

/**
 * Check if player already submitted for this date
 */
async function checkPlayerSubmission(date: string, playerName: string): Promise<boolean> {
  const result = await db.query(
    'SELECT 1 FROM daily_results WHERE date = $1 AND player_name = $2',
    [date, playerName]
  );
  
  return result.rows.length > 0;
}

/**
 * Save daily challenge result
 */
async function saveDailyResult(date: string, playerName: string, score: number, rounds: any[]): Promise<void> {
  // NOW() will use the database timezone (America/Chicago)
  await db.query(
    'INSERT INTO daily_results (date, player_name, score, rounds, completed_at) VALUES ($1, $2, $3, $4, NOW())',
    [date, playerName, score, JSON.stringify(rounds)]
  );
}

export default router;