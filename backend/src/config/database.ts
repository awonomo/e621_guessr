export interface DatabaseConfig {
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl: boolean | { rejectUnauthorized: boolean };
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
  };
  scoring: {
    maxPoints: number;
    minPoints: number | Record<number, number>; // Can be single value or category-specific
    sweetSpot: Record<number, { mu: number; sigma: number }>;
    categoryWeights: Record<number, number>;
  };
  tagRefresh: {
    baseUrl: string;
    safeDayOffset: number;
    batchSize: number;
    maxRetries: number;
  };
}

export const config: DatabaseConfig = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'e621_guessr',
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
      0: 100,  // General
      1: 800,  // Artist
      2: 2000,  // Contributor
      3: 1000,  // Copyright
      4: 1500,  // Character
      5: 800,  // Species
      6: 1000,   // Invalid
      7: 925,   // Meta
      8: 725    // Lore
    },
    sweetSpot: {
      0: { mu: 2.5, sigma: 0.621 }, // General
      1: { mu: 1.8, sigma: 1 }, // Artist
      2: { mu: 2.2, sigma: 0.6 }, // Contributor
      3: { mu: 1.9, sigma: 0.9 }, // Copyright
      4: { mu: 2, sigma: 1.3 }, // Character
      5: { mu: 2.3, sigma: 0.4 }, // Species
      6: { mu: 1.0, sigma: 0.5 }, // Invalid
      7: { mu: 3.2, sigma: 0.5 }, // Meta
      8: { mu: 3.8, sigma: 0.8 }  // Lore
    },
    categoryWeights: {
      0: 1.15, // General
      1: 0.4, // Artist
      2: 1.2, // Contributor
      3: 1.2, // Copyright
      4: 1, // Character
      5: 1.3, // Species
      6: 0.5, // Invalid
      7: 0.6, // Meta
      8: 0.4  // Lore
    }
  },
  tagRefresh: {
    baseUrl: 'https://e621.net/db_export',
    safeDayOffset: 1,
    batchSize: 1000,
    maxRetries: 3
  }
};

