import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../database/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DatabaseInitializer {
  
  /**
   * Initialize the database with schema
   */
  async initializeDatabase(): Promise<void> {
    console.log('🗃️  Initializing database...');
    
    try {
      // Read schema file
      const schemaPath = path.join(__dirname, '../database/schema.sql');
      const schema = await fs.readFile(schemaPath, 'utf-8');
      
      // Execute schema
      await db.query(schema);
      
      console.log('✅ Database schema initialized successfully');
      
      // Populate blacklist data
      await this.populateBlacklist();
      
      console.log('✅ Database blacklist populated successfully');
      
      // Check if we need to enable extensions
      await this.ensureExtensions();
      
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }
  
  /**
   * Ensure required PostgreSQL extensions are enabled
   */
  private async ensureExtensions(): Promise<void> {
    console.log('🔧 Checking PostgreSQL extensions...');
    
    try {
      // Try to enable trigram extension for fuzzy text search
      await db.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
      console.log('✅ pg_trgm extension enabled');
      
      // Try to enable additional text search extensions
      await db.query('CREATE EXTENSION IF NOT EXISTS unaccent');
      console.log('✅ unaccent extension enabled');
      
    } catch (error) {
      console.warn('⚠️  Some extensions could not be enabled:', error);
      console.warn('   This may affect fuzzy search performance');
    }
  }
  
  /**
   * Populate the daily blacklist tags
   */
  private async populateBlacklist(): Promise<void> {
    console.log('📋 Populating blacklist data...');
    
    try {
      // Try to load the real blacklist file first (not committed to repo)
      let blacklistPath = path.join(__dirname, '../../populate_blacklist.sql');
      let blacklistData: string;
      
      try {
        blacklistData = await fs.readFile(blacklistPath, 'utf-8');
        console.log('✅ Loaded custom blacklist data');
      } catch {
        // Fall back to example file
        blacklistPath = path.join(__dirname, '../../populate_blacklist_example.sql');
        blacklistData = await fs.readFile(blacklistPath, 'utf-8');
        console.log('📝 Loaded example blacklist data (add populate_blacklist.sql for custom data)');
      }
      
      // Execute blacklist population
      await db.query(blacklistData);
      
    } catch (error) {
      console.warn('⚠️  Could not populate blacklist data:', error);
      console.warn('   This may be normal if the files don\'t exist');
    }
  }
  
  /**
   * Check if database is properly initialized
   */
  async checkDatabaseStatus(): Promise<boolean> {
    try {
      // Check if main tables exist
      const result = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('tags', 'tag_aliases', 'game_sessions', 'game_rounds', 'guess_details')
      `);
      
      const expectedTables = 5;
      const actualTables = result.rows.length;
      
      if (actualTables === expectedTables) {
        console.log('✅ Database is properly initialized');
        return true;
      } else {
        console.log(`⚠️  Database incomplete: ${actualTables}/${expectedTables} tables found`);
        return false;
      }
      
    } catch (error) {
      console.error('❌ Database status check failed:', error);
      return false;
    }
  }
  
  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<any> {
    try {
      const [tagCount, aliasCount, sessionCount] = await Promise.all([
        db.query('SELECT COUNT(*) as count FROM tags'),
        db.query('SELECT COUNT(*) as count FROM tag_aliases'),
        db.query('SELECT COUNT(*) as count FROM game_sessions')
      ]);
      
      return {
        tags: parseInt(tagCount.rows[0].count),
        aliases: parseInt(aliasCount.rows[0].count),
        sessions: parseInt(sessionCount.rows[0].count)
      };
      
    } catch (error) {
      console.error('Error getting database stats:', error);
      return {
        tags: 0,
        aliases: 0,
        sessions: 0
      };
    }
  }
  
  /**
   * Reset database (development only)
   */
  async resetDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Database reset is not allowed in production');
    }
    
    console.log('🗑️  Resetting database...');
    
    try {
      // Drop all tables in reverse dependency order
      await db.query('DROP TABLE IF EXISTS guess_details CASCADE');
      await db.query('DROP TABLE IF EXISTS game_rounds CASCADE');
      await db.query('DROP TABLE IF EXISTS game_sessions CASCADE');
      await db.query('DROP TABLE IF EXISTS daily_statistics CASCADE');
      await db.query('DROP TABLE IF EXISTS tag_refresh_log CASCADE');
      await db.query('DROP TABLE IF EXISTS tag_aliases CASCADE');
      await db.query('DROP TABLE IF EXISTS tags CASCADE');
      
      console.log('✅ Database reset completed');
      
      // Reinitialize
      await this.initializeDatabase();
      
    } catch (error) {
      console.error('❌ Database reset failed:', error);
      throw error;
    }
  }
}

export default new DatabaseInitializer();