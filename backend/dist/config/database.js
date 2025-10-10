export const config = {
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'tag_challenge',
        user: process.env.DB_USER || process.env.USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        // Add connection options for better compatibility
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    },
    scoring: {
        maxPoints: 10000,
        minPoints: {
            0: 100, // General
            1: 100, // Artist
            2: 100, // Contributor
            3: 100, // Copyright
            4: 100, // Character
            5: 1000, // Species
            6: 100, // Invalid
            7: 100, // Meta
            8: 100 // Lore
        },
        sweetSpot: {
            0: { mu: 2.5, sigma: 0.8 }, // General
            1: { mu: 1.8, sigma: 0.7 }, // Artist
            2: { mu: 2.2, sigma: 0.6 }, // Contributor
            3: { mu: 1.9, sigma: 0.9 }, // Copyright
            4: { mu: 2, sigma: 1.5 }, // Character
            5: { mu: 2.3, sigma: 0.6 }, // Species
            6: { mu: 1.0, sigma: 0.5 }, // Invalid
            7: { mu: 3.2, sigma: 0.5 }, // Meta
            8: { mu: 3.8, sigma: 0.4 } // Lore
        },
        categoryWeights: {
            0: 1.15, // General
            1: 0.4, // Artist
            2: 1.2, // Contributor
            3: 1.2, // Copyright
            4: 0.75, // Character
            5: 1.3, // Species
            6: 0.5, // Invalid
            7: 0.6, // Meta
            8: 0.3 // Lore
        }
    },
    tagRefresh: {
        baseUrl: 'https://e621.net/db_export',
        safeDayOffset: 1,
        batchSize: 1000,
        maxRetries: 3
    }
};
//# sourceMappingURL=database.js.map