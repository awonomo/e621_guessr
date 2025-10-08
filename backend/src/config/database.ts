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
    minPoints: number;
    sweetSpot: Record<number, { mu: number; sigma: number }>;
    categoryWeights: Record<number, number>;
    manualMultipliers: Record<string, number>;
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
    minPoints: 100, // Minimum points for any correct guess
    sweetSpot: {
      0: { mu: 2.5, sigma: 0.8 }, // General
      1: { mu: 1.8, sigma: 0.7 }, // Artist
      2: { mu: 1.5, sigma: 0.6 }, // Contributor
      3: { mu: 2.2, sigma: 0.7 }, // Copyright
      4: { mu: 2.0, sigma: 0.8 }, // Character
      5: { mu: 2.3, sigma: 0.7 }, // Species
      6: { mu: 1.0, sigma: 0.5 }, // Invalid
      7: { mu: 1.7, sigma: 0.6 }, // Meta
      8: { mu: 1.2, sigma: 0.4 }  // Lore
    },
    categoryWeights: {
      0: 1.2, // General - hardest
      1: 0.6, // Artist - often visible signatures
      2: 0.8, // Contributor
      3: 0.9, // Copyright
      4: 1.0, // Character - baseline
      5: 1.1, // Species
      6: 0.3, // Invalid - low value
      7: 0.7, // Meta
      8: 1.5  // Lore - extremely rare
    },
    // Manual score multipliers for specific tags
    // These are applied AFTER the base scoring calculation
    // Values > 1.0 boost the score, values < 1.0 reduce it
    manualMultipliers: {
      // Example boosted tags (interesting but undervalued)
      'anthro': 1.2,           // Very common but fundamental
      'feral': 1.15,           // Important distinction
      'solo': 0.8,             // Very common, reduce score
      'duo': 0.9,              // Common, slight reduction
      'group': 1.1,            // Less common, slight boost
      
      // Quality/artistic tags that deserve recognition
      'detailed_background': 1.3,
      'amazing_background': 1.4,
      'cel_shading': 1.2,
      
      // Problematic or overly easy tags
      'hi_res': 0.5,           // Too easy, most posts have this
      'digital_media_(artwork)': 0.6, // Very common
      'simple_background': 0.8, // Common and easy to spot
      
      // Technical excellence tags
      'pixel_(artwork)': 1.3,  // Specific art style recognition
      'traditional_media_(artwork)': 1.2,
      'sketch': 0.9,           // Often obvious
      
      // Anatomical detail recognition (skill-based)
      'plantigrade': 1.4,      // Requires anatomical knowledge
      'digitigrade': 1.3,      // Anatomical knowledge
      'pawpads': 1.1,          // Detail observation
      'intersex': 1.5,         
      'andromorph': 1.5,
      'gynomorph': 1.5,
      'proboscis': 3,

      // Story/context tags that show deep understanding
      'romantic': 1.2,
      'wholesome': 1.3,
      'melancholy': 1.4,       // Emotional nuance
      
      // Clothing/accessory detail recognition
      'collar': 1.1,
      'jewelry': 1.2,
      'hat': 1.1,
      
      // Body type recognition
      'muscular': 1.1,
      'overweight': 1.2,
      'slim': 0.9,
      'athletic': 1.1
    }
  },
  tagRefresh: {
    baseUrl: 'https://e621.net/db_export',
    safeDayOffset: 1,
    batchSize: 1000,
    maxRetries: 3
  }
};

