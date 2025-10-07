export declare class DatabaseManager {
    private static instance;
    private pool;
    private constructor();
    static getInstance(): DatabaseManager;
    query(text: string, params?: any[]): Promise<any>;
    getClient(): Promise<import("pg").PoolClient>;
    close(): Promise<void>;
    healthCheck(): Promise<boolean>;
}
declare const _default: DatabaseManager;
export default _default;
