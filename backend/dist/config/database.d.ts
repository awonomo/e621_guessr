export interface DatabaseConfig {
    database: {
        host: string;
        port: number;
        database: string;
        user: string;
        password: string;
        ssl: boolean | {
            rejectUnauthorized: boolean;
        };
        max: number;
        idleTimeoutMillis: number;
        connectionTimeoutMillis: number;
    };
    scoring: {
        maxPoints: number;
        sweetSpot: Record<number, {
            mu: number;
            sigma: number;
        }>;
        categoryWeights: Record<number, number>;
    };
    tagRefresh: {
        baseUrl: string;
        safeDayOffset: number;
        batchSize: number;
        maxRetries: number;
    };
}
export declare const config: DatabaseConfig;
