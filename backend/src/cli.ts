#!/usr/bin/env node

import { Command } from 'commander';
import DatabaseInitializer from './scripts/dbInit.js';
import TagDataManager from './services/TagDataManager.js';
import { ScoringService } from './services/ScoringService.js';
import db from './database/connection.js';

const program = new Command();

program
  .name('tag-game-cli')
  .description('CLI tools for e621 Tag Challenge backend')
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

program.parse();