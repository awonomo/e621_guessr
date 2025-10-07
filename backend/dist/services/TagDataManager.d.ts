export interface TagData {
    id: number;
    name: string;
    category: string;
    post_count: number;
}
export interface TagAliasData {
    antecedent_name: string;
    consequent_name: string;
    status: string;
}
export declare class TagDataManager {
    /**
     * Main refresh function - downloads and processes tag data
     */
    refreshTagData(): Promise<void>;
    /**
     * Download and parse tags CSV
     */
    private downloadAndParseTags;
    /**
     * Download and parse tag aliases CSV
     */
    private downloadAndParseAliases;
    /**
     * Process and store tags in database
     */
    private processTags;
    /**
     * Process and store aliases in database
     */
    private processAliases;
    /**
     * Get the date to use for downloading (current date - offset)
     */
    private getRefreshDate;
    /**
     * Build download URL for given type and date
     */
    private buildUrl;
    /**
     * Log refresh operation
     */
    private logRefresh;
    /**
     * Get tag by name with fuzzy matching (used by ScoringService)
     */
    findTag(query: string): Promise<any>;
}
declare const _default: TagDataManager;
export default _default;
