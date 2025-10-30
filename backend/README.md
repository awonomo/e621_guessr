# e621 Tag Challenge - Backend

A Node.js/Express backend API for the e621 Tag Challenge game, featuring tag scoring, daily challenges, and admin tools.

## Features

- 🏷️ **Tag Management**: Download and process tag data from e621 API
- 🏆 **Scoring System**: Smart scoring based on tag rarity and category
- � **Daily Challenges**: Server-generated daily content with blacklist filtering
- 🔧 **Admin Tools**: Remote blacklist management for content moderation
- 💾 **PostgreSQL**: Robust database with full-text search
- 🔍 **Fuzzy Matching**: Intelligent tag matching for user input
- 🛡️ **Production Ready**: Rate limiting, security headers, error handling

## Prerequisites

- **Node.js** 18+ 
- **PostgreSQL** 12+
- **npm** or **yarn**

## Quick Start

1. **Clone & Install**
   ```bash
   cd backend
   npm install
   ```

2. **Database Setup**
   
   Create a PostgreSQL database and user:
   ```sql
   CREATE DATABASE e621_guessr;
   CREATE USER tag_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE e621_guessr TO tag_user;
   ```

3. **Environment Configuration**
   
   Create `.env` file:
   ```env
   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=e621_guessr
   DB_USER=tag_user
   DB_PASSWORD=your_password
   
   # Server
   PORT=3001
   NODE_ENV=development
   ```

4. **Initialize & Setup**
   ```bash
   # Complete setup (database + tag data)
   npm run setup
   
   # Or step by step:
   npm run db:init     # Initialize database schema + blacklist data
   npm run tags:refresh # Download tag data (takes ~5-10 minutes)
   ```

5. **Blacklist Configuration** (Optional)
   
   The database initialization automatically populates a content blacklist for daily challenges.
   
   - **Development**: Uses `populate_blacklist_example.sql` with placeholder tags
   - **Production**: Create `populate_blacklist.sql` with your actual blacklist (gitignored)
   
   The blacklist filters out sensitive content from daily challenge generation.

6. **Start Development Server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3001`

## CLI Commands

The backend includes a comprehensive CLI for management tasks:

```bash
# Complete setup
npm run setup

# 1. Ensure PostgreSQL running (usually automatic)
brew services start postgresql@15  # if needed

# 2. Start backend
cd "/path/to/backend"
npm run dev  # That's it!

# Database management  
npm run db:init        # Initialize schema
npm run db:status      # Check status & stats
npm run cli db reset   # Reset database (dev only)

# Tag management
npm run tags:refresh   # Download latest tag data
npm run cli tags search "tag_name"  # Search for specific tag

# Post fetching (for manual daily challenge curation)
npm run cli -- posts fetch-ids 12345 67890 11111 22222 33333  # Fetch by specific IDs
npm run cli -- posts fetch-criteria "halloween solo -animated score:>=400"  # Fetch by criteria
npm run cli -- posts fetch-criteria "halloween" --count 10 --output halloween.json  # Save to file

# Daily challenge management
# Clear specific date's daily challenge (replace date as needed)
psql -d e621_guessr -c "DELETE FROM daily_results WHERE date = '2025-10-08'; DELETE FROM daily_challenges WHERE date = '2025-10-08';"
# OR
curl -X DELETE http://localhost:3001/api/daily/2025-10-08

# Generate new daily challenge for today
curl http://localhost:3001/api/daily/$(date +%Y-%m-%d)

# Quick test (easiest)
npm run cli -- tags search "wolf"
npm run cli -- tags search "scientist"
npm run cli -- tags search "sleeping"

# Batch testing different rarities
npm run cli -- tags search "anthro"    # Very common
npm run cli -- tags search "dragon"    # Common 
npm run cli -- tags search "sleeping"  # Medium
npm run cli -- tags search "scientist" # Rare
```

## 🛠️ Admin Tools

### Daily Challenge Blacklist Management

The backend includes a blacklist system specifically for **daily challenges only**. This filters inappropriate content from daily challenge posts before they're served to players.

**Note**: This blacklist only affects daily challenges. Regular gameplay uses client-side filtering (stored in browser localStorage) since there are no user accounts.

#### API Endpoints
- `GET /api/admin/blacklist` - List all blacklisted tags
- `POST /api/admin/blacklist` - Add a new tag
- `DELETE /api/admin/blacklist/:id` - Remove by ID  
- `DELETE /api/admin/blacklist/tag/:tag` - Remove by name
- `PUT /api/admin/blacklist/bulk` - Bulk add/remove operations

All endpoints require `X-Admin-Key` header with the admin key.

#### CLI Tool
```bash
# Use the npm script (recommended)
npm run blacklist list
npm run blacklist add "inappropriate_tag"
npm run blacklist remove 5

# Or run directly
node scripts/manage-blacklist.js list
node scripts/manage-blacklist.js add "inappropriate_tag"
node scripts/manage-blacklist.js remove 5
node scripts/manage-blacklist.js remove "tag_name"
node scripts/manage-blacklist.js bulk-add tag1 tag2 tag3
```

**Environment Variables:**
- `ADMIN_KEY` - Admin authentication key (default: `dev_admin_2024`)
- `BACKEND_URL` - Backend server URL for production (default: `http://localhost:3001`)

#### cURL Examples
```bash
# List daily challenge blacklisted tags
curl -H "X-Admin-Key: your_admin_key" http://localhost:3001/api/admin/blacklist

# Add a tag to daily challenge blacklist
curl -X POST -H "Content-Type: application/json" -H "X-Admin-Key: your_admin_key" \
  -d '{"tag":"new_blocked_tag"}' http://localhost:3001/api/admin/blacklist

# Remove a tag from daily challenge blacklist
curl -X DELETE -H "X-Admin-Key: your_admin_key" \
  http://localhost:3001/api/admin/blacklist/tag/tag_to_remove
```

## API Endpoints

### Tag Scoring
- `POST /api/scoring/score` - Score a single tag guess (main endpoint)
- `GET /api/scoring/health` - Health check for scoring service

### Tag Management  
- `POST /api/tags/refresh` - Trigger tag data refresh
- `GET /api/tags/search/:query` - Search for tag
- `GET /api/tags/refresh/status` - Get refresh status & history

### System
- `GET /api/health` - Health check

## Database Schema

The system uses PostgreSQL with these main tables:

- **tags** - Tag data with scoring information
- **tag_aliases** - Tag aliases for matching variations
- **game_sessions** - Individual game sessions
- **game_rounds** - Rounds within sessions
- **guess_details** - Individual tag guesses
- **tag_refresh_log** - Tag refresh history

## Scoring Algorithm

The scoring system uses a **3-layer approach** designed to reward meaningful, contextual tag discoveries:

### Layer 1: Manual Overrides
Special tags with manually set scores for achievements, bonus points, or outlier corrections.

### Layer 2: Heuristic Scoring Formula
```
Score = MaxPoints × RarityCurve × CategoryWeight × Quality
```

**Rarity Curve**: Bell-shaped curve over log(post_count) - rewards the "sweet spot" of specific but not noisy tags
**Category Weights**: Difficulty-based multipliers reflecting how hard categories are to guess
**Quality**: Manual quality assessment (obvious vs contextual tags)

### E621 Tag Categories (0-8)
- **0 - General** (1.2x): Hardest category - objects, actions, descriptors
- **1 - Artist** (0.6x): Often has visible signatures, easier to spot
- **2 - Contributor** (0.8x): Small category
- **3 - Copyright** (0.9x): Franchise/series tags
- **4 - Character** (1.0x): Balanced difficulty
- **5 - Species** (1.1x): Good difficulty, less obvious than artists
- **6 - Invalid** (0.3x): Low-value tags
- **7 - Meta** (0.7x): Technical/site tags
- **8 - Lore** (1.5x): Extremely rare, high value

### Layer 3: Live API Fallback
For brand-new tags not in the database, conservative low scores until the next data refresh.

## Development

```bash
# Development with hot reload
npm run dev

# Type checking
npm run lint

# Format code
npm run format

# Build for production
npm run build
npm start
```

## Production Deployment

1. **Environment Variables**
   ```env
   NODE_ENV=production
   DB_HOST=your-db-host
   DB_NAME=your-db-name
   DB_USER=your-db-user
   DB_PASSWORD=your-secure-password
   PORT=3001
   ```

2. **Build & Deploy**
   ```bash
   npm run build
   npm start
   ```

3. **Database Setup**
   ```bash
   # On production server
   npm run db:init
   npm run tags:refresh
   ```

## Tag Data Refresh

The system downloads tag data from e621's daily exports:
- **Frequency**: Manual trigger or scheduled
- **Data Source**: `https://e621.net/db_export/tags-YYYY-MM-DD.csv.gz`
- **Processing**: Filters active tags, calculates scores
- **Size**: ~2M tags, ~500K aliases (compressed ~50MB)

Refresh process:
1. Downloads latest CSV export
2. Processes and filters active tags
3. Updates database with new scores
4. Maintains refresh history

## Architecture

```
├── src/
│   ├── server.ts           # Main Express server
│   ├── cli.ts             # CLI interface
│   ├── config/            # Configuration
│   ├── database/          # Database connection & schema
│   ├── middleware/        # Express middleware
│   ├── routes/            # API route handlers
│   ├── services/          # Business logic
│   └── scripts/           # Database utilities
```

## Performance Considerations

- **Database Indexing**: Optimized for tag searches and scoring
- **Connection Pooling**: Efficient PostgreSQL connections
- **Rate Limiting**: Prevents API abuse
- **Fuzzy Search**: pg_trgm extension for fast text matching
- **Batch Processing**: Efficient tag data imports

## Error Handling

- Comprehensive error logging
- Graceful degradation for tag matching
- Database transaction rollback
- Rate limit protection
- Input validation

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## License

MIT License - see LICENSE file for details