import { Router } from 'express';
import db from '../database/connection.js';
import { ScoringService } from '../services/ScoringService.js';
import { E621Post, PostsQuery } from '../types.js';

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

// BLACKLISTED tags
const DAILY_BLACKLIST = [
  'young',
  'young_(lore)',
  'cub',
  'gore',
  'death',
  'suicide',
  'blood',
  'bad_parenting',
  'babysitter',
  'incest_(lore)',
  'self-harm',
  'abuse',
  'kidnapping',
  'slave',
  'rape',
  'forced',
  'bestiality',
  'extreme_penetraton',
  'bestiality',
  'anthro_on_feral',
  'realistic_feral',
  'human_on_feral',
  'human_on_anthro',
  'birth',
  'scat',
  'diaper',
  'prolapse',
  'extreme_prolapse',
  'urethral_penetration',
  'feces',
  'disembowelment',
  'dissection',
  'entrails',
  'nightmare_fuel',
  'scatplay',
];

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
  MIN_SCORE_THRESHOLD: 250, // Daily challenge passing score
  MIN_POST_SCORE: 200 // Minimum e621 post score for quality
};

/**
 * Get or generate daily challenge for a specific date
 */
router.get('/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        error: 'Invalid date format',
        message: 'Date must be in YYYY-MM-DD format'
      });
    }

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
router.get('/:date/status', async (req, res) => {
  try {
    const { date } = req.params;
    const { player_name } = req.query;

    if (!player_name || typeof player_name !== 'string') {
      return res.status(400).json({
        error: 'Player name required',
        message: 'Please provide player_name as query parameter'
      });
    }

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

      return res.json({
        completed: true,
        result: {
          score: result.rows[0].score,
          rounds: rounds,
          completed_at: result.rows[0].completed_at
        }
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
router.post('/:date/submit', async (req, res) => {
  try {
    const { date } = req.params;
    const { player_name, score, rounds } = req.body;

    // Validate input
    if (!player_name || typeof player_name !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Player name is required'
      });
    }

    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({
        error: 'Invalid input', 
        message: 'Score must be a non-negative number'
      });
    }

    if (!Array.isArray(rounds) || rounds.length !== DAILY_CONFIG.ROUNDS) {
      return res.status(400).json({
        error: 'Invalid input',
        message: `Rounds must be an array of ${DAILY_CONFIG.ROUNDS} items`
      });
    }

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
      message: 'Daily challenge result saved',
      passed: score >= DAILY_CONFIG.MIN_SCORE_THRESHOLD
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
router.delete('/:date', async (req, res) => {
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
          'User-Agent': 'e621TagChallenge/1.0 (https://github.com/user/repo)'
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
      if (passesBlacklist(post)) {
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
 * Check if a post passes the blacklist filter
 */
function passesBlacklist(post: any): boolean {
  const allTags = Object.values(post.tags).flat() as string[];
  
  for (const blacklistedTag of DAILY_BLACKLIST) {
    if (allTags.includes(blacklistedTag)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Save daily challenge to database
 */
async function saveDailyChallenge(date: string, posts: E621Post[]): Promise<DailyChallenge> {
  console.log('Saving daily challenge with', posts.length, 'posts');
  
  const postsJson = JSON.stringify(posts);
  console.log('JSON serialized successfully, length:', postsJson.length);
  
  try {
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
  await db.query(
    'INSERT INTO daily_results (date, player_name, score, rounds, completed_at) VALUES ($1, $2, $3, $4, NOW())',
    [date, playerName, score, JSON.stringify(rounds)]
  );
}

export default router;