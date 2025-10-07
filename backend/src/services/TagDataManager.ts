import axios from 'axios';
import zlib from 'zlib';
import csv from 'csv-parser';
import { Readable } from 'stream';

// @ts-ignore - csv-parser doesn't have official types
import db from '../database/connection.js';
import { config } from '../config/database.js';

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

export class TagDataManager {
  
  /**
   * Main refresh function - downloads and processes tag data
   */
  async refreshTagData(): Promise<void> {
    console.log('🔄 Starting tag data refresh...');
    
    const refreshDate = this.getRefreshDate();
    const startTime = Date.now();
    
    try {
      // Download and process tags
      const tagsUrl = this.buildUrl('tags', refreshDate);
      const aliasesUrl = this.buildUrl('tag_aliases', refreshDate);
      
      console.log(`📥 Downloading tags from: ${tagsUrl}`);
      const tagData = await this.downloadAndParseTags(tagsUrl);
      
      console.log(`📥 Downloading aliases from: ${aliasesUrl}`);
      const aliasData = await this.downloadAndParseAliases(aliasesUrl);
      
      // Process and store in database
      await this.processTags(tagData);
      await this.processAliases(aliasData);
      
      const duration = Math.floor((Date.now() - startTime) / 1000);
      
      // Log refresh
      await this.logRefresh(refreshDate, tagData.length, aliasData.length, duration, 'completed');
      
      console.log(`✅ Tag refresh completed in ${duration}s`);
      console.log(`   • ${tagData.length} tags processed`);
      console.log(`   • ${aliasData.length} aliases processed`);
      
    } catch (error) {
      console.error('❌ Tag refresh failed:', error);
      const duration = Math.floor((Date.now() - startTime) / 1000);
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logRefresh(refreshDate, 0, 0, duration, 'failed', errorMessage);
      throw error;
    }
  }
  
  /**
   * Download and parse tags CSV
   */
  private async downloadAndParseTags(url: string): Promise<TagData[]> {
    const response = await axios.get(url, { 
      responseType: 'stream',
      timeout: 300000 // 5 minutes
    });
    
    const tags: TagData[] = [];
    
    return new Promise((resolve, reject) => {
      response.data
        .pipe(zlib.createGunzip())
        .pipe(csv())
        .on('data', (row: any) => {
          const postCount = parseInt(row.post_count || '0');
          
          // Filter out tags with 0 post count
          if (postCount > 0) {
            tags.push({
              id: parseInt(row.id),
              name: row.name?.trim(),
              category: row.category?.trim(),
              post_count: postCount
            });
          }
        })
        .on('end', () => {
          console.log(`📊 Parsed ${tags.length} active tags`);
          resolve(tags);
        })
        .on('error', reject);
    });
  }
  
  /**
   * Download and parse tag aliases CSV
   */
  private async downloadAndParseAliases(url: string): Promise<TagAliasData[]> {
    const response = await axios.get(url, { 
      responseType: 'stream',
      timeout: 300000 // 5 minutes
    });
    
    const aliases: TagAliasData[] = [];
    
    return new Promise((resolve, reject) => {
      response.data
        .pipe(zlib.createGunzip())
        .pipe(csv())
        .on('data', (row: any) => {
          const status = row.status?.trim();
          
          // Only keep active aliases
          if (status === 'active') {
            aliases.push({
              antecedent_name: row.antecedent_name?.trim(),
              consequent_name: row.consequent_name?.trim(),
              status: status
            });
          }
        })
        .on('end', () => {
          console.log(`📊 Parsed ${aliases.length} active aliases`);
          resolve(aliases);
        })
        .on('error', reject);
    });
  }
  
  /**
   * Process and store tags in database
   */
  private async processTags(tagData: TagData[]): Promise<void> {
    console.log('💾 Processing tags into database...');
    
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Clear existing tags
      await client.query('DELETE FROM tags');
      
      // Batch insert new tags
      const batchSize = 1000;
      for (let i = 0; i < tagData.length; i += batchSize) {
        const batch = tagData.slice(i, i + batchSize);
        const values = batch.map((tag, index) => {
          const baseIndex = index * 3;
          return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3})`;
        }).join(', ');
        
        const params = batch.flatMap(tag => [tag.name, tag.category, tag.post_count]);
        
        await client.query(`
          INSERT INTO tags (name, category, post_count) 
          VALUES ${values}
        `, params);
        
        if (i % 10000 === 0) {
          console.log(`   • Processed ${i + batch.length}/${tagData.length} tags`);
        }
      }
      
      await client.query('COMMIT');
      console.log('✅ Tags processed successfully');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Process and store aliases in database
   */
  private async processAliases(aliasData: TagAliasData[]): Promise<void> {
    console.log('💾 Processing aliases into database...');
    
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Clear existing aliases
      await client.query('DELETE FROM tag_aliases');
      
      // Batch insert new aliases
      const batchSize = 1000;
      for (let i = 0; i < aliasData.length; i += batchSize) {
        const batch = aliasData.slice(i, i + batchSize);
        const values = batch.map((_, index) => {
          const baseIndex = index * 3;
          return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3})`;
        }).join(', ');
        
        const params = batch.flatMap(alias => [alias.antecedent_name, alias.consequent_name, alias.status]);
        
        // Only insert if the consequent tag exists
        await client.query(`
          INSERT INTO tag_aliases (antecedent_name, consequent_name, status) 
          SELECT * FROM (VALUES ${values}) AS v(antecedent_name, consequent_name, status)
          WHERE EXISTS (SELECT 1 FROM tags WHERE name = v.consequent_name)
        `, params);
        
        if (i % 10000 === 0) {
          console.log(`   • Processed ${i + batch.length}/${aliasData.length} aliases`);
        }
      }
      
      await client.query('COMMIT');
      console.log('✅ Aliases processed successfully');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  

  
  /**
   * Get the date to use for downloading (current date - offset)
   */
  private getRefreshDate(): string {
    const date = new Date();
    date.setDate(date.getDate() - config.tagRefresh.safeDayOffset);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }
  
  /**
   * Build download URL for given type and date
   */
  private buildUrl(type: 'tags' | 'tag_aliases', date: string): string {
    return `${config.tagRefresh.baseUrl}/${type}-${date}.csv.gz`;
  }
  
  /**
   * Log refresh operation
   */
  private async logRefresh(
    date: string, 
    tagsProcessed: number, 
    aliasesProcessed: number, 
    duration: number, 
    status: string,
    errorMessage?: string
  ): Promise<void> {
    await db.query(`
      INSERT INTO tag_refresh_log 
      (refresh_date, tags_processed, aliases_processed, duration_seconds, status, error_message)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [date, tagsProcessed, aliasesProcessed, duration, status, errorMessage || null]);
  }
  
  /**
   * Get tag by name with fuzzy matching (used by ScoringService)
   */
  async findTag(query: string): Promise<any> {
    // First try exact match
    let result = await db.query(
      'SELECT name, category, post_count, quality, manual_score FROM tags WHERE name = $1',
      [query.toLowerCase().trim()]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    // Try alias match
    result = await db.query(`
      SELECT t.name, t.category, t.post_count, t.quality, t.manual_score 
      FROM tags t
      JOIN tag_aliases a ON t.name = a.consequent_name
      WHERE a.antecedent_name = $1 AND a.status = 'active'
    `, [query.toLowerCase().trim()]);
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    // Try fuzzy match using ILIKE (simple fuzzy search)
    result = await db.query(`
      SELECT name, category, post_count, quality, manual_score,
        CASE 
          WHEN name ILIKE $1 THEN 1.0
          WHEN name ILIKE '%' || $2 || '%' THEN 0.8
          ELSE 0.6
        END as match_score
      FROM tags 
      WHERE (name ILIKE $1 OR name ILIKE '%' || $2 || '%')
      ORDER BY match_score DESC, post_count DESC
      LIMIT 1
    `, [`%${query.toLowerCase().trim()}%`, query.toLowerCase().trim()]);
    
    return result.rows.length > 0 && result.rows[0].match_score >= 0.6 ? result.rows[0] : null;
  }
}

export default new TagDataManager();