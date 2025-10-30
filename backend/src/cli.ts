#!/usr/bin/env node

// Load environment variables from .env file
import 'dotenv/config';

import { Command } from 'commander';
import DatabaseInitializer from './scripts/dbInit.js';
import TagDataManager from './services/TagDataManager.js';
import { ScoringService } from './services/ScoringService.js';
import db from './database/connection.js';

const program = new Command();

program
  .name('tag-game-cli')
  .description('CLI tools for e621_guessr backend')
  .version('1.0.0');

// Database commands
const dbCommand = program
  .command('db')
  .description('Database management commands');

dbCommand
  .command('init')
  .description('Initialize database schema')
  .action(async () => {
    try {
      await DatabaseInitializer.initializeDatabase();
      console.log('🎉 Database initialization completed');
      process.exit(0);
    } catch (error) {
      console.error('Database initialization failed:', error);
      process.exit(1);
    }
  });

dbCommand
  .command('status')
  .description('Check database status and statistics')
  .action(async () => {
    try {
      const isReady = await DatabaseInitializer.checkDatabaseStatus();
      const stats = await DatabaseInitializer.getDatabaseStats();
      
      console.log('\n📊 Database Status:');
      console.log(`   Ready: ${isReady ? '✅' : '❌'}`);
      console.log(`   Tags: ${stats.tags.toLocaleString()}`);
      console.log(`   Aliases: ${stats.aliases.toLocaleString()}`);
      console.log(`   Game Sessions: ${stats.sessions.toLocaleString()}\n`);
      
      process.exit(0);
    } catch (error) {
      console.error('Failed to check database status:', error);
      process.exit(1);
    }
  });

dbCommand
  .command('reset')
  .description('Reset database (development only)')
  .action(async () => {
    try {
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ Database reset is not allowed in production');
        process.exit(1);
      }
      
      await DatabaseInitializer.resetDatabase();
      console.log('🎉 Database reset completed');
      process.exit(0);
    } catch (error) {
      console.error('Database reset failed:', error);
      process.exit(1);
    }
  });

// Tag management commands
const tagsCommand = program
  .command('tags')
  .description('Tag data management commands');

tagsCommand
  .command('refresh')
  .description('Download and process latest tag data from e621')
  .action(async () => {
    try {
      console.log('🔄 Starting tag data refresh...');
      console.log('   This may take several minutes...\n');
      
      await TagDataManager.refreshTagData();
      console.log('\n🎉 Tag refresh completed successfully');
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Tag refresh failed:', error);
      process.exit(1);
    }
  });

tagsCommand
  .command('search <query>')
  .description('Search for a tag')
  .action(async (query: string) => {
    try {
      const scoringService = new ScoringService();
      const result = await scoringService.scoreTag(query);
      
      if (result.isCorrect) {
        console.log('\n🏷️  Tag Found:');
        console.log(`   Name: ${result.actualTag}`);
        console.log(`   Category: ${result.category}`);
        console.log(`   Score: ${result.score} points`);
        console.log(`   Guess: "${result.guess}" -> ${result.actualTag}\n`);
      } else {
        console.log(`\n❌ No tag found matching "${query}"\n`);
      }
      
      process.exit(0);
    } catch (error) {
      console.error('Tag search failed:', error);
      process.exit(1);
    }
  });

// Setup command for complete initialization
program
  .command('setup')
  .description('Complete setup: initialize database and download tag data')
  .action(async () => {
    try {
      console.log('🚀 Starting complete setup...\n');
      
      // Initialize database
      console.log('1️⃣  Initializing database...');
      await DatabaseInitializer.initializeDatabase();
      console.log('   ✅ Database ready\n');
      
      // Download tag data
      console.log('2️⃣  Downloading tag data...');
      console.log('   This may take several minutes...\n');
      await TagDataManager.refreshTagData();
      console.log('   ✅ Tag data ready\n');
      
      // Show final status
      const stats = await DatabaseInitializer.getDatabaseStats();
      console.log('🎉 Setup completed successfully!');
      console.log(`   📊 ${stats.tags.toLocaleString()} tags loaded`);
      console.log(`   🔗 ${stats.aliases.toLocaleString()} aliases loaded`);
      console.log('\n   Your e621 Tag Challenge backend is ready to use!');
      
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Setup failed:', error);
      process.exit(1);
    }
  });

// Graceful cleanup
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down...');
  await db.close();
  process.exit(0);
});

// Testing commands  
const testCommand = program
  .command('test')
  .description('Testing and debugging commands');

testCommand
  .command('contextual-multiplier <tagName>')
  .description('Test contextual multiplier pattern matching for a tag')
  .option('-c, --category <number>', 'tag category (0-8)', parseInt)
  .action(async (tagName: string, options: { category?: number }) => {
    try {
      const { getContextualMultiplier, getTagMultiplierBreakdown } = await import('./config/multipliers.js');
      
      let category = options.category;
      
      // If no category specified, look it up from the database
      if (category === undefined) {
        try {
          const result = await db.query('SELECT category FROM tags WHERE name = $1', [tagName]);
          if (result.rows.length > 0) {
            category = result.rows[0].category;
            console.log(`\n🏷️  Testing contextual multipliers for: "${tagName}"`);
            console.log(`   Database Category: ${category}`);
          } else {
            console.log(`\n🏷️  Testing contextual multipliers for: "${tagName}"`);
            console.log(`   ⚠️  Tag not found in database, testing without category restriction`);
          }
        } catch (dbError) {
          console.log(`\n🏷️  Testing contextual multipliers for: "${tagName}"`);
          console.log(`   ⚠️  Database error, testing without category restriction`);
        }
      } else {
        console.log(`\n🏷️  Testing contextual multipliers for: "${tagName}"`);
        console.log(`   Manual Category: ${category}`);
      }
      
      const multiplier = getContextualMultiplier(tagName, category);
      const breakdown = getTagMultiplierBreakdown(tagName, category);
      
      console.log(`\n📊 Results:`);
      console.log(`   Contextual Multiplier: ${multiplier}`);
      console.log(`   Final Multiplier: ${breakdown.finalMultiplier}`);
      console.log(`   Source: ${breakdown.source}`);
      
      if (breakdown.contextualEffects && breakdown.contextualEffects.length > 0) {
        console.log(`\n🎯 Matched Contexts:`);
        breakdown.contextualEffects.forEach(effect => {
          console.log(`   - ${effect.context}/${effect.subcontext}: ${effect.effect > 0 ? '+' : ''}${effect.effect}`);
        });
        console.log(`\n💡 Calculation: ${breakdown.calculation}`);
      }
      
      process.exit(0);
    } catch (error) {
      console.error('Error testing contextual multiplier:', error);
      process.exit(1);
    }
  });

// Posts management commands
const postsCommand = program
  .command('posts')
  .description('Post fetching and management commands');

postsCommand
  .command('fetch-ids <ids...>')
  .description('Fetch posts from e621 by their IDs')
  .option('-o, --output <file>', 'Save JSON to file instead of console')
  .option('--skip-blacklist', 'Skip blacklist validation')
  .action(async (ids: string[], options: { output?: string; skipBlacklist?: boolean }) => {
    try {
      console.log(`\n🔍 Fetching ${ids.length} posts from e621...\n`);
      
      const { readFileSync } = await import('fs');
      const { join } = await import('path');
      const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
      const E621_USER_AGENT = `e621_guessr/${packageJson.version} (https://github.com/awonomo/e621_guessr)`;
      
      const posts: any[] = [];
      const errors: Array<{ id: string | number; error: string }> = [];
      
      for (const id of ids) {
        try {
          const postId = parseInt(id);
          if (isNaN(postId)) {
            errors.push({ id, error: 'Invalid post ID (not a number)' });
            continue;
          }
          
          console.log(`   Fetching post ${postId}...`);
          
          const response = await fetch(`https://e621.net/posts/${postId}.json`, {
            headers: { 'User-Agent': E621_USER_AGENT }
          });
          
          if (!response.ok) {
            errors.push({ id: postId, error: `HTTP ${response.status}` });
            continue;
          }
          
          const data = await response.json();
          
          if (!data.post) {
            errors.push({ id: postId, error: 'Post not found' });
            continue;
          }
          
          const post = data.post;
          
          // Validate post has enough tags
          const tagCount = Object.values(post.tags).flat().length;
          if (tagCount < 50) {
            console.log(`   ⚠️  Post ${postId} only has ${tagCount} tags (recommended: 50+)`);
          }
          
          // Check blacklist if not skipped
          if (!options.skipBlacklist) {
            const { checkPostAgainstBlacklist } = await import('./utils/blacklist.js');
            const blacklistResult = await db.query('SELECT tag FROM daily_blacklist_tags');
            const blacklistedTags = blacklistResult.rows.map((row: { tag: string }) => row.tag);
            
            if (!checkPostAgainstBlacklist(post, blacklistedTags)) {
              console.log(`   ⚠️  Post ${postId} contains blacklisted tags`);
            }
          }
          
          posts.push(post);
          console.log(`   ✅ Post ${postId} fetched successfully (${tagCount} tags)`);
          
        } catch (error) {
          errors.push({ id, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
      
      console.log(`\n📊 Results: ${posts.length} posts fetched, ${errors.length} errors\n`);
      
      if (errors.length > 0) {
        console.log('❌ Errors:');
        errors.forEach(err => console.log(`   Post ${err.id}: ${err.error}`));
        console.log();
      }
      
      const output = JSON.stringify(posts, null, 2);
      
      if (options.output) {
        const { writeFileSync } = await import('fs');
        const { resolve } = await import('path');
        const outputPath = resolve(options.output);
        writeFileSync(outputPath, output);
        console.log(`💾 Saved to: ${outputPath}`);
      } else {
        console.log('📋 JSON Output:\n');
        console.log(output);
      }
      
      await db.close();
      process.exit(errors.length > 0 ? 1 : 0);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      await db.close();
      process.exit(1);
    }
  });

postsCommand
  .command('fetch-criteria <criteria>')
  .description('Fetch 5 random posts from e621 matching custom criteria')
  .option('-n, --count <number>', 'Number of posts to fetch', '5')
  .option('-o, --output <file>', 'Save JSON to file instead of console')
  .option('--skip-blacklist', 'Skip blacklist validation')
  .action(async (criteria: string, options: { count?: string; output?: string; skipBlacklist?: boolean }) => {
    try {
      const count = parseInt(options.count || '5');
      console.log(`\n🔍 Fetching ${count} posts matching: "${criteria}"\n`);
      
      const { readFileSync } = await import('fs');
      const { join } = await import('path');
      const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
      const E621_USER_AGENT = `e621_guessr/${packageJson.version} (https://github.com/awonomo/e621_guessr)`;
      
      const posts: any[] = [];
      const maxAttempts = count * 10; // Allow 10 attempts per needed post
      let attempts = 0;
      
      // Add recommended filters to criteria
      const enhancedCriteria = `${criteria} -animated tagcount:>=50`;
      console.log(`   Using query: ${enhancedCriteria}\n`);
      
      while (posts.length < count && attempts < maxAttempts) {
        attempts++;
        
        try {
          const apiUrl = `https://e621.net/posts.json?tags=${encodeURIComponent(enhancedCriteria)}&limit=1`;
          const response = await fetch(apiUrl, {
            headers: { 'User-Agent': E621_USER_AGENT }
          });
          
          if (!response.ok) {
            throw new Error(`E621 API error: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (!data.posts || data.posts.length === 0) {
            console.log('   No more posts found matching criteria');
            break;
          }
          
          const post = data.posts[0];
          
          // Check if we already have this post
          if (posts.some(p => p.id === post.id)) {
            continue;
          }
          
          // Check blacklist if not skipped
          let passesBlacklist = true;
          if (!options.skipBlacklist) {
            const { checkPostAgainstBlacklist } = await import('./utils/blacklist.js');
            const blacklistResult = await db.query('SELECT tag FROM daily_blacklist_tags');
            const blacklistedTags = blacklistResult.rows.map((row: { tag: string }) => row.tag);
            passesBlacklist = checkPostAgainstBlacklist(post, blacklistedTags);
          }
          
          if (passesBlacklist || options.skipBlacklist) {
            const tagCount = Object.values(post.tags).flat().length;
            posts.push(post);
            console.log(`   ✅ Post ${post.id} (${tagCount} tags) - ${posts.length}/${count}`);
          } else {
            console.log(`   ⚠️  Post ${post.id} contains blacklisted tags (skipped)`);
          }
          
        } catch (error) {
          console.error('   Error fetching post:', error instanceof Error ? error.message : error);
        }
      }
      
      console.log(`\n📊 Results: ${posts.length} posts fetched in ${attempts} attempts\n`);
      
      if (posts.length < count) {
        console.log(`⚠️  Warning: Only found ${posts.length}/${count} posts\n`);
      }
      
      const output = JSON.stringify(posts, null, 2);
      
      if (options.output) {
        const { writeFileSync } = await import('fs');
        const { resolve } = await import('path');
        const outputPath = resolve(options.output);
        writeFileSync(outputPath, output);
        console.log(`💾 Saved to: ${outputPath}`);
      } else {
        console.log('📋 JSON Output:\n');
        console.log(output);
      }
      
      await db.close();
      process.exit(posts.length > 0 ? 0 : 1);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      await db.close();
      process.exit(1);
    }
  });

program.parse();