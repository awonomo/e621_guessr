import db from '../database/connection.js';
import { config } from '../config/database.js';
import { getTagMultiplier, getProgressiveScalingConfig, getContextualMultiplier } from '../config/multipliers.js';
export class ScoringService {
    /**
     * Debug method to get detailed scoring breakdown for visualization
     */
    getDetailedScoring(postCount, category) {
        const sweetSpot = config.scoring.sweetSpot[category];
        const mu = sweetSpot?.mu || 2.5;
        const sigma = sweetSpot?.sigma || 1.0;
        const categoryWeight = config.scoring.categoryWeights[category] || 1.0;
        const minPoints = this.getMinPointsForCategory(category);
        const maxPoints = config.scoring.maxPoints;
        // Current single-stage algorithm
        const rarityScore = this.rarityCurve(postCount, category);
        const baseScore = minPoints + (maxPoints - minPoints) * rarityScore;
        // Create a mock tag to get the final score with all multipliers
        const mockTag = {
            name: `debug_tag`,
            category: category,
            post_count: postCount,
            quality: 1.0
        };
        const finalScore = this.calculateTagScore(mockTag);
        return {
            rarityScore,
            baseScore,
            finalScore,
            parameters: {
                mu,
                sigma,
                categoryWeight,
                minPoints,
                maxPoints
            }
        };
    }
    /**
     * Score a single tag guess - the main scoring method
     */
    async scoreTag(guess) {
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
     * Calculate tag score using simplified single-stage algorithm (100-10000 points)
     */
    calculateTagScore(tag) {
        // Single-stage rarity calculation
        const rarityScore = this.rarityCurve(tag.post_count, tag.category);
        const categoryWeight = config.scoring.categoryWeights[tag.category] || 1.0;
        const quality = tag.quality || 1.0; // Default quality
        // Get manual multiplier from separate config
        const manualMultiplier = getTagMultiplier(tag.name);
        // Get contextual multiplier (pattern-based and manual contexts)
        const contextualMultiplier = getContextualMultiplier(tag.name, tag.category);
        const minPoints = this.getMinPointsForCategory(tag.category);
        const maxPoints = config.scoring.maxPoints;
        // Calculate base score before manual adjustments
        const baseScore = minPoints + (maxPoints - minPoints) * rarityScore;
        // Apply category weight and quality first
        const weightedScore = baseScore * categoryWeight * quality;
        // Apply manual multiplier with configurable progressive scaling
        // Higher base scores get more reduction/less boost
        // Lower base scores get less reduction/more boost
        let scoreAfterManual;
        if (manualMultiplier !== 1.0) {
            const scalingConfig = getProgressiveScalingConfig();
            if (scalingConfig.enabled) {
                // Normalize score to 0-1 range for progressive calculation
                const normalizedScore = (weightedScore - minPoints) / (maxPoints - minPoints);
                // Calculate progressive multiplier effect using config
                const effectRange = scalingConfig.maxEffect - scalingConfig.minEffect;
                const progressiveFactor = scalingConfig.minEffect + (normalizedScore * effectRange);
                if (manualMultiplier > 1.0) {
                    // For boosts: low scores get bigger boost, high scores get smaller boost
                    const boost = (manualMultiplier - 1.0) * (1.0 - progressiveFactor);
                    scoreAfterManual = weightedScore * (1.0 + boost);
                }
                else {
                    // For reductions: high scores get bigger reduction, low scores get smaller reduction
                    const reduction = (1.0 - manualMultiplier) * progressiveFactor;
                    scoreAfterManual = weightedScore * (1.0 - reduction);
                }
            }
            else {
                // Linear scaling when progressive scaling is disabled
                scoreAfterManual = weightedScore * manualMultiplier;
            }
        }
        else {
            scoreAfterManual = weightedScore;
        }
        // Apply contextual multiplier with the same progressive scaling
        let finalScore;
        if (contextualMultiplier !== 1.0) {
            const scalingConfig = getProgressiveScalingConfig();
            if (scalingConfig.enabled) {
                // Normalize score to 0-1 range for progressive calculation
                const normalizedScore = (scoreAfterManual - minPoints) / (maxPoints - minPoints);
                // Calculate progressive multiplier effect using config
                const effectRange = scalingConfig.maxEffect - scalingConfig.minEffect;
                const progressiveFactor = scalingConfig.minEffect + (normalizedScore * effectRange);
                if (contextualMultiplier > 1.0) {
                    // For boosts: low scores get bigger boost, high scores get smaller boost
                    const boost = (contextualMultiplier - 1.0) * (1.0 - progressiveFactor);
                    finalScore = Math.round(scoreAfterManual * (1.0 + boost));
                }
                else {
                    // For reductions: high scores get bigger reduction, low scores get smaller reduction
                    const reduction = (1.0 - contextualMultiplier) * progressiveFactor;
                    finalScore = Math.round(scoreAfterManual * (1.0 - reduction));
                }
            }
            else {
                // Linear scaling when progressive scaling is disabled
                finalScore = Math.round(scoreAfterManual * contextualMultiplier);
            }
        }
        else {
            finalScore = Math.round(scoreAfterManual);
        }
        // Ensure minimum score
        return Math.max(minPoints, finalScore);
    }
    /**
     * Rarity curve calculation - single-stage bell curve with power scaling
     * Combines Gaussian distribution with built-in score spreading
     */
    rarityCurve(postCount, category) {
        const sweetSpot = config.scoring.sweetSpot[category];
        const mu = sweetSpot?.mu || 2.5;
        const sigma = sweetSpot?.sigma || 1.0;
        // Single-stage approach: Modified bell curve with better natural distribution
        const x = Math.log10(Math.max(postCount, 1));
        // Gaussian with power scaling for smoother distribution
        const rawRarity = Math.exp(-Math.pow(x - mu, 2) / (2 * Math.pow(sigma, 2)));
        // Apply gentle power scaling for better score distribution
        const scaledRarity = Math.pow(rawRarity, 0.4);
        return scaledRarity;
    }
    /**
     * Find tag with fuzzy matching
     */
    async findTag(query) {
        // First try exact match
        let result = await db.query('SELECT name, category, post_count, quality FROM tags WHERE name = $1', [query]);
        if (result.rows.length > 0) {
            return result.rows[0];
        }
        // Try alias match
        result = await db.query(`
      SELECT t.name, t.category, t.post_count, t.quality 
      FROM tags t
      JOIN tag_aliases a ON t.name = a.consequent_name
      WHERE a.antecedent_name = $1 AND a.status = 'active'
    `, [query]);
        if (result.rows.length > 0) {
            return result.rows[0];
        }
        // Try fuzzy match using ILIKE
        result = await db.query(`
      SELECT name, category, post_count, quality,
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
                quality: row.quality
            };
        }
        return null;
    }
    /**
     * Layer 3: Live API fallback for new tags
     * Only called when tag is not found in local database
     */
    async getTagFromAPI(tagName) {
        try {
            // Check if tag exists on e621 by searching for posts with that tag
            const searchUrl = `https://e621.net/posts.json?tags=${encodeURIComponent(tagName)}&limit=1`;
            const response = await fetch(searchUrl, {
                headers: {
                    'User-Agent': 'TagChallenge/1.0 (by your_username_here)' // Required by e621 API
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
                    quality: 1.0
                };
            }
            return null;
        }
        catch (error) {
            console.warn(`Layer 3 API fallback failed for "${tagName}":`, error);
            return null;
        }
    }
    /**
     * Get the minimum points for a specific category
     */
    getMinPointsForCategory(category) {
        const minPointsConfig = config.scoring.minPoints;
        // If minPoints is a number (backwards compatibility), use it for all categories
        if (typeof minPointsConfig === 'number') {
            return minPointsConfig;
        }
        // Otherwise, get category-specific minPoints or default to 100
        return minPointsConfig[category] || 100;
    }
}
export default new ScoringService();
//# sourceMappingURL=ScoringService.js.map