import db from '../database/connection.js';
import { config } from '../config/database.js';

export interface TagScore {
  guess: string;
  actualTag?: string;
  score: number;
  isCorrect: boolean;
  category?: number;
}

export interface E621Tag {
  name: string;
  category: number;
  post_count: number;
  quality?: number;
  manual_score?: number;
}

export class ScoringService {
  
  /**
   * Score a single tag guess - the main scoring method
   */
  async scoreTag(guess: string): Promise<TagScore> {
    const normalizedGuess = guess.toLowerCase().trim();
    
    // Layer 1-2: Find the tag in database (with fuzzy matching)
    let tag = await this.findTag(normalizedGuess);
    
    // Layer 3: If not found locally, check e621 API for valid tags
    if (!tag) {
      tag = await this.getTagFromAPI(normalizedGuess);
    }
    
    // If still not found, it's an incorrect guess
    if (!tag) {
      return {
        guess: guess,
        score: 0,
        isCorrect: false
      };
    }
    
    // Calculate score using the 3-layer system
    const score = this.calculateTagScore(tag);
    
    return {
      guess: guess,
      actualTag: tag.name,
      score: score,
      isCorrect: true,
      category: tag.category
    };
  }
  
  /**
   * 3-Layer scoring system with improved distribution (100-10,000 points)
   */
  private calculateTagScore(tag: E621Tag): number {
    // Layer 1: Manual overrides
    if (tag.manual_score !== null && tag.manual_score !== undefined) {
      return tag.manual_score;
    }
    
    // Layer 2: Heuristic scoring with better distribution
    const rarityScore = this.rarityCurve(tag.post_count, tag.category);
    const categoryWeight = config.scoring.categoryWeights[tag.category] || 1.0;
    const quality = tag.quality || 1.0; // Default quality
    
    // New scoring formula for better distribution:
    // - Use logarithmic interpolation between min and max points
    // - Apply category weight and quality multipliers
    // - Ensure minimum score for very common tags
    
    const minPoints = config.scoring.minPoints;
    const maxPoints = config.scoring.maxPoints;
    
    // Convert rarity score (0-1) to logarithmic scale for better distribution
    // This makes lower scores more interesting and spreads them out more
    const logRarityScore = rarityScore === 0 ? 0 : Math.log10(rarityScore * 9 + 1) / Math.log10(10);
    
    // Calculate base score using logarithmic interpolation
    const baseScore = minPoints + (maxPoints - minPoints) * Math.pow(logRarityScore, 0.7);
    
    // Apply multipliers
    const finalScore = Math.round(baseScore * categoryWeight * quality);
    
    // Ensure minimum score
    return Math.max(minPoints, finalScore);
  }
  
  /**
   * Rarity curve calculation - bell-shaped curve over log(post_count)
   */
  private rarityCurve(postCount: number, category: number): number {
    const sweetSpot = config.scoring.sweetSpot[category];
    const mu = sweetSpot?.mu || 2.5; // Default sweet spot around 100-1000 posts
    const sigma = sweetSpot?.sigma || 1.0;
    
    // Log-normal curve
    const x = Math.log10(Math.max(postCount, 1));
    const rarity = Math.exp(-Math.pow(x - mu, 2) / (2 * Math.pow(sigma, 2)));
    
    return rarity;
  }
  
  /**
   * Find tag with fuzzy matching
   */
  private async findTag(query: string): Promise<E621Tag | null> {
    // First try exact match
    let result = await db.query(
      'SELECT name, category, post_count, quality, manual_score FROM tags WHERE name = $1',
      [query]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    // Try alias match
    result = await db.query(`
      SELECT t.name, t.category, t.post_count, t.quality, t.manual_score 
      FROM tags t
      JOIN tag_aliases a ON t.name = a.consequent_name
      WHERE a.antecedent_name = $1 AND a.status = 'active'
    `, [query]);
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    // Try fuzzy match using ILIKE
    result = await db.query(`
      SELECT name, category, post_count, quality, manual_score,
        CASE 
          WHEN name ILIKE $1 THEN 1.0
          WHEN name ILIKE '%' || $2 || '%' THEN 0.8
          ELSE 0.6
        END as match_score
      FROM tags 
      WHERE (name ILIKE $1 OR name ILIKE '%' || $2 || '%')
      ORDER BY match_score DESC, post_count DESC
      LIMIT 1
    `, [`%${query}%`, query]);
    
    if (result.rows.length > 0 && result.rows[0].match_score >= 0.6) {
      const row = result.rows[0];
      return {
        name: row.name,
        category: row.category,
        post_count: row.post_count,
        quality: row.quality,
        manual_score: row.manual_score
      };
    }
    
    return null;
  }
  
  /**
   * Layer 3: Live API fallback for new tags
   * Only called when tag is not found in local database
   */
  private async getTagFromAPI(tagName: string): Promise<E621Tag | null> {
    try {
      // Check if tag exists on e621 by searching for posts with that tag
      const searchUrl = `https://e621.net/posts.json?tags=${encodeURIComponent(tagName)}&limit=1`;
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'TagChallenge/1.0 (by your_username_here)'  // Required by e621 API
        }
      });
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      
      // If posts found with this tag, it's a valid tag
      if (data.posts && data.posts.length > 0) {
        // Create a minimal tag object for scoring
        // Since we don't have exact category/post_count from this API call,
        // we'll use conservative defaults
        return {
          name: tagName,
          category: 0, // Default to general category
          post_count: 1, // Conservative estimate - will get low score
          quality: 1.0,
          manual_score: undefined
        };
      }
      
      return null;
    } catch (error) {
      console.warn(`Layer 3 API fallback failed for "${tagName}":`, error);
      return null;
    }
  }
}

export default new ScoringService();