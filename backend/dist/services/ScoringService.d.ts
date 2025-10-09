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
}
export declare class ScoringService {
    /**
     * Debug method to get detailed scoring breakdown for visualization
     */
    getDetailedScoring(postCount: number, category: number): {
        rarityScore: number;
        baseScore: number;
        finalScore: number;
        parameters: {
            mu: number;
            sigma: number;
            categoryWeight: number;
            minPoints: number;
            maxPoints: number;
        };
    };
    /**
     * Score a single tag guess - the main scoring method
     */
    scoreTag(guess: string): Promise<TagScore>;
    /**
     * Calculate tag score using simplified single-stage algorithm (100-10000 points)
     */
    private calculateTagScore;
    /**
     * Rarity curve calculation - single-stage bell curve with power scaling
     * Combines Gaussian distribution with built-in score spreading
     */
    private rarityCurve;
    /**
     * Find tag with fuzzy matching
     */
    private findTag;
    /**
     * Layer 3: Live API fallback for new tags
     * Only called when tag is not found in local database
     */
    private getTagFromAPI;
}
declare const _default: ScoringService;
export default _default;
