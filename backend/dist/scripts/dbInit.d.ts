export declare class DatabaseInitializer {
    /**
     * Initialize the database with schema
     */
    initializeDatabase(): Promise<void>;
    /**
     * Ensure required PostgreSQL extensions are enabled
     */
    private ensureExtensions;
    /**
     * Check if database is properly initialized
     */
    checkDatabaseStatus(): Promise<boolean>;
    /**
     * Get database statistics
     */
    getDatabaseStats(): Promise<any>;
    /**
     * Reset database (development only)
     */
    resetDatabase(): Promise<void>;
}
declare const _default: DatabaseInitializer;
export default _default;
