import express from 'express';
import fetch from 'node-fetch';
import { z } from 'zod';
import { PostsQuery, PostsApiResponse, E621Post } from '../types.js';
import { createError } from '../middleware/errorHandler.js';

const router = express.Router();

// Validation schemas
const postsQuerySchema = z.object({
  tags: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(5),
  page: z.coerce.number().min(1).default(1),
  minScore: z.coerce.number().optional(),
  ratings: z.string().optional(), // comma-separated: 'safe,questionable'
  customCriteria: z.string().max(100).optional()
});

// E621 API configuration
const E621_BASE_URL = 'https://e621.net';
const USER_AGENT = 'e621_guesst/2.0 (by awonomo)';

// Helper function to build E621 query
function buildE621Query(params: PostsQuery): string {
  const tags: string[] = [];

  // Always start with order:random for games
  tags.push('order:random');

  // Handle ratings (abbreviated format: s, q, e)
  if (params.ratings && params.ratings.length > 0) {
    if (params.ratings.length === 1) {
      // Only one rating selected
      const ratingMap = {
        safe: 'rating:s',
        questionable: 'rating:q', 
        explicit: 'rating:e'
      };
      tags.push(ratingMap[params.ratings[0]]);
    } else if (params.ratings.length === 2) {
      // Two ratings selected, exclude the missing one
      const allRatings = ['safe', 'questionable', 'explicit'];
      const excluded = allRatings.find(r => !params.ratings!.includes(r as any));
      if (excluded) {
        const ratingMap = {
          safe: '-rating:s',
          questionable: '-rating:q',
          explicit: '-rating:e'
        };
        tags.push(ratingMap[excluded as keyof typeof ratingMap]);
      }
    }
    // If all three ratings are selected, don't add any rating filters
  } else {
    // Default to safe if no rating specified
    tags.push('rating:s');
  }

  // Minimum score
  if (params.minScore && params.minScore > 0) {
    tags.push(`score:>=${params.minScore}`);
  }

  // Minimum tag count for game quality
  tags.push('tagcount:>=50');

  // Base restrictions for game content
  tags.push('-type:mp4');
  tags.push('-type:webm');
  tags.push('-type:swf');
  tags.push('-young -young_(lore)');

  // Custom criteria (allow user to add specific requirements)
  if (params.customCriteria?.trim()) {
    // Split custom criteria by spaces and add each as separate tag
    const customTags = params.customCriteria.trim().split(/\s+/);
    
    // Filter out post ID patterns (id:number or just numbers) and system parameters
    const filteredTags = customTags.filter(tag => {
      // Block patterns like "id:123", "id:123456", or standalone numbers
      if (/^id:\d+$/.test(tag) || /^\d+$/.test(tag)) {
        return false;
      }
      // Block system parameters that could break the game
      if (/^limit:/i.test(tag) || /^tagcount:/i.test(tag)) {
        return false;
      }
      return true;
    });
    
    tags.push(...filteredTags);
  }

  // User provided tags
  if (params.tags?.trim()) {
    // Split user tags by spaces and add each as separate tag
    const userTags = params.tags.trim().split(/\s+/);
    tags.push(...userTags);
  }

  return tags.join(' ');
}

// GET /api/posts - Fetch posts for game
router.get('/', async (req, res, next) => {
  try {
    // Validate query parameters
    const query = postsQuerySchema.parse(req.query);
    
    // Parse ratings if provided
    let ratings: PostsQuery['ratings'];
    if (query.ratings) {
      ratings = query.ratings.split(',').filter(r => 
        ['safe', 'questionable', 'explicit'].includes(r)
      ) as PostsQuery['ratings'];
    }

    // Build API query
    const e621Query = buildE621Query({
      tags: query.tags,
      minScore: query.minScore,
      ratings,
      customCriteria: query.customCriteria
    });

    console.log('🔍 E621 Query:', e621Query);

    // Make request to E621 API
    const apiUrl = `${E621_BASE_URL}/posts.json?limit=${query.limit}&page=${query.page}&tags=${encodeURIComponent(e621Query)}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'awonomo/e621guessr by awonomo',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw createError(`E621 API error: ${response.statusText}`, response.status);
    }

    const data = await response.json() as { posts: E621Post[] };

    // Filter out posts with insufficient tags or problematic content
    const filteredPosts = data.posts.filter(post => {
      const totalTags = Object.values(post.tags).flat().length;
      return totalTags >= 50 && 
             !post.flags.deleted && 
             !post.flags.pending &&
             post.file?.url; // Ensure file exists
    });

    if (filteredPosts.length === 0) {
      throw createError('Not enough posts found for these tags.', 404);
    }

    console.log(`✅ Found ${filteredPosts.length} posts`);

    // Log post URLs for debugging
    filteredPosts.forEach((post, idx) => {
      console.log(`📸 Post ${idx + 1}: https://e621.net/posts/${post.id}`);
      // console.log(post);
    });

    const result: PostsApiResponse = {
      posts: filteredPosts,
      total: filteredPosts.length,
      page: query.page,
      hasMore: filteredPosts.length === query.limit
    };

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/posts/:id - Get specific post details
router.get('/:id', async (req, res, next) => {
  // Only allow in development - not currently used by frontend
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  try {
    const postId = parseInt(req.params.id);
    
    if (isNaN(postId)) {
      throw createError('Invalid post ID', 400);
    }

    const apiUrl = `${E621_BASE_URL}/posts/${postId}.json`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw createError('Post not found', 404);
      }
      throw createError(`E621 API error: ${response.statusText}`, response.status);
    }

    const data = await response.json() as { post: E621Post };

    res.json({
      success: true,
      data: data.post
    });

  } catch (error) {
    next(error);
  }
});

export { router as postsRouter };