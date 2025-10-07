import db from '../database/connection.js';
import { config } from '../config/database.js';
export class ScoringService {
    /**
     * Score a single tag guess - the main scoring method
     */
    async scoreTag(guess) {
        const normalizedGuess = guess.toLowerCase().trim();
        // Find the tag in database (with fuzzy matching)
        const tag = await this.findTag(normalizedGuess);
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
     * 3-Layer scoring system
     */
    calculateTagScore(tag) {
        // Layer 1: Manual overrides
        if (tag.manual_score !== null && tag.manual_score !== undefined) {
            return tag.manual_score;
        }
        // Layer 2: Heuristic scoring
        const rarityScore = this.rarityCurve(tag.post_count, tag.category);
        const categoryWeight = config.scoring.categoryWeights[tag.category] || 1.0;
        const quality = tag.quality || 1.0; // Default quality
        const score = Math.round(config.scoring.maxPoints *
            rarityScore *
            categoryWeight *
            quality);
        return Math.max(1, score); // Minimum 1 point for any correct guess
    }
    /**
     * Rarity curve calculation - bell-shaped curve over log(post_count)
     */
    rarityCurve(postCount, category) {
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
    async findTag(query) {
        // First try exact match
        let result = await db.query('SELECT name, category, post_count, quality, manual_score FROM tags WHERE name = $1', [query]);
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
     */
    async getTagFromAPI(tagName) {
        try {
            // This would call e621 API to get fresh tag data
            // For now, return null to keep it simple
            // TODO: Implement when needed
            return null;
        }
        catch (error) {
            console.warn('Failed to fetch tag from API:', error);
            return null;
        }
    }
}
export default new ScoringService();
//# sourceMappingURL=ScoringService.js.map