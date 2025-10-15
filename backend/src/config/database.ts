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
    timezone?: string; // Add timezone option
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

/**
 * Parse DATABASE_URL for Railway/production deployments
 * Format: postgresql://user:password@host:port/database
 */
function parseDatabaseUrl(databaseUrl: string) {
  try {
    const url = new URL(databaseUrl);
    
    if (url.protocol !== 'postgresql:') {
      throw new Error('Invalid DATABASE_URL protocol. Expected postgresql:');
    }
    
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1), // Remove leading slash
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
    };
  } catch (error) {
    console.error('Failed to parse DATABASE_URL:', error);
    throw new Error('Invalid DATABASE_URL format');
  }
}

// Get database configuration - prefer DATABASE_URL for production, fallback to individual vars
const databaseUrl = process.env.DATABASE_URL;
const dbConfigFromUrl = databaseUrl ? parseDatabaseUrl(databaseUrl) : null;

// Debug logging for DATABASE_URL parsing
// console.log('🔍 DATABASE_URL from env:', process.env.DATABASE_URL);
// console.log('🔍 Parsed result:', dbConfigFromUrl);

// Log database configuration for debugging
console.log('🗃️  Database Configuration:');
if (dbConfigFromUrl) {
  console.log(`   📍 Using DATABASE_URL: ${databaseUrl!.replace(/:([^:@]{4})[^:@]*@/, ':$1****@')}`);
  console.log(`   🏠 Host: ${dbConfigFromUrl.host}:${dbConfigFromUrl.port}`);
  console.log(`   📊 Database: ${dbConfigFromUrl.database}`);
  console.log(`   👤 User: ${dbConfigFromUrl.user}`);
} else {
  console.log('   📍 Using individual environment variables:');
  console.log(`   🏠 Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}`);
  console.log(`   📊 Database: ${process.env.DB_NAME || 'e621_guessr'}`);
  console.log(`   👤 User: ${process.env.DB_USER || process.env.USER || 'postgres'}`);
}
console.log(`   🔒 SSL: ${process.env.NODE_ENV === 'production' ? 'enabled' : 'disabled'}`);
console.log(`   🕐 Timezone: America/Chicago (CST)`);
console.log();

export const config: DatabaseConfig = {
  database: {
    host: dbConfigFromUrl?.host || process.env.DB_HOST || 'localhost',
    port: dbConfigFromUrl?.port || parseInt(process.env.DB_PORT || '5432'),
    database: dbConfigFromUrl?.database || process.env.DB_NAME || 'e621_guessr',
    user: dbConfigFromUrl?.user || process.env.DB_USER || process.env.USER || 'postgres',
    password: dbConfigFromUrl?.password || process.env.DB_PASSWORD || '',
    // Add connection options for better compatibility
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    // Set timezone to CST for all database operations
    timezone: 'America/Chicago',
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

