#!/usr/bin/env node

/**
 * Simple CLI tool for managing daily challenge blacklist locally
 * Note: This blacklist only affects daily challenges, not regular gameplay
 * Usage: node scripts/manage-blacklist.js [command] [args...]
 */

const ADMIN_KEY = process.env.ADMIN_KEY || 'dev_admin_2024';
const API_BASE = process.env.BACKEND_URL || 'http://localhost:3001';

async function makeRequest(endpoint, method = 'GET', body = null) {
  const url = `${API_BASE}/api/admin${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': ADMIN_KEY
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Error:', data.error || 'Unknown error');
      console.error('   Message:', data.message || 'No additional details');
      process.exit(1);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Network error:', error.message);
    console.error('   Make sure the server is running on', API_BASE);
    process.exit(1);
  }
}

async function listBlacklist() {
  const data = await makeRequest('/blacklist');
  
  console.log(`\n📋 Daily Challenge Blacklisted Tags (${data.count} total):`);
  console.log('═'.repeat(60));
  
  if (data.tags.length === 0) {
    console.log('   (No blacklisted tags found)');
  } else {
    data.tags.forEach((tag, i) => {
      console.log(`${String(i + 1).padStart(3)}. ${tag.tag} (ID: ${tag.id})`);
    });
  }
  console.log();
}

async function addTag(tag) {
  if (!tag) {
    console.error('❌ Tag name is required');
    console.log('   Usage: node manage-blacklist.js add <tag_name>');
    process.exit(1);
  }
  
  const data = await makeRequest('/blacklist', 'POST', { tag });
  console.log('✅', data.message);
}

async function removeTag(identifier) {
  if (!identifier) {
    console.error('❌ Tag ID or name is required');
    console.log('   Usage: node manage-blacklist.js remove <id_or_tag_name>');
    process.exit(1);
  }
  
  // Try as ID first (if it's a number), then as tag name
  const isId = /^\d+$/.test(identifier);
  const endpoint = isId ? `/blacklist/${identifier}` : `/blacklist/tag/${encodeURIComponent(identifier)}`;
  
  const data = await makeRequest(endpoint, 'DELETE');
  console.log('✅', data.message);
}

async function bulkAdd(tags) {
  if (!tags || tags.length === 0) {
    console.error('❌ At least one tag is required');
    console.log('   Usage: node manage-blacklist.js bulk-add tag1 tag2 tag3...');
    process.exit(1);
  }
  
  const data = await makeRequest('/blacklist/bulk', 'PUT', { action: 'add', tags });
  console.log(`✅ Added ${data.processed} tags:`, data.tags.join(', '));
}

async function showHelp() {
  console.log(`
🛠️  Daily Challenge Blacklist Management CLI

Note: This blacklist only affects daily challenges. Regular gameplay uses 
      client-side filtering stored in the user's browser.

Commands:
  list                     List all daily challenge blacklisted tags
  add <tag>               Add a tag to daily challenge blacklist  
  remove <id_or_tag>      Remove tag from daily challenge blacklist
  bulk-add <tag1> <tag2>  Add multiple tags to daily challenge blacklist
  help                    Show this help message

Examples:
  node manage-blacklist.js list
  node manage-blacklist.js add "inappropriate_tag"
  node manage-blacklist.js remove 5
  node manage-blacklist.js remove "tag_name"
  node manage-blacklist.js bulk-add tag1 tag2 tag3

Environment Variables:
  ADMIN_KEY     Admin authentication key (default: dev_admin_2024)
  BACKEND_URL   Backend server URL (default: http://localhost:3001)
`);
}

// Main CLI logic
async function main() {
  const [,, command, ...args] = process.argv;
  
  if (!command || command === 'help') {
    await showHelp();
    return;
  }
  
  switch (command) {
    case 'list':
      await listBlacklist();
      break;
    case 'add':
      await addTag(args[0]);
      break;
    case 'remove':
      await removeTag(args[0]);
      break;
    case 'bulk-add':
      await bulkAdd(args);
      break;
    default:
      console.error(`❌ Unknown command: ${command}`);
      await showHelp();
      process.exit(1);
  }
}

main().catch(console.error);