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
export declare class ScoringService {
    /**
     * Score a single tag guess - the main scoring method
     */
    scoreTag(guess: string): Promise<TagScore>;
    /**
     * 3-Layer scoring system
     */
    private calculateTagScore;
    /**
     * Rarity curve calculation - bell-shaped curve over log(post_count)
     */
    private rarityCurve;
    /**
     * Find tag with fuzzy matching
     */
    private findTag;
    /**
     * Layer 3: Live API fallback for new tags
     */
    private getTagFromAPI;
}
declare const _default: ScoringService;
export default _default;
