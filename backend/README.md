# e621 Tag Challenge - Backend

A Node.js/Express backend API for the e621 Tag Challenge game, featuring tag scoring, leaderboards, and game session management.

## Features

- 🏷️ **Tag Management**: Download and process tag data from e621 API
- 🏆 **Scoring System**: Smart scoring based on tag rarity and category
- 📊 **Leaderboards**: Track top players and game statistics  
- 🎮 **Game Sessions**: Complete game session management
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
   CREATE DATABASE tag_challenge;
   CREATE USER tag_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE tag_challenge TO tag_user;
   ```

3. **Environment Configuration**
   
   Create `.env` file:
   ```env
   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=tag_challenge
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
   npm run db:init     # Initialize database schema
   npm run tags:refresh # Download tag data (takes ~5-10 minutes)
   ```

5. **Start Development Server**
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

# Daily challenge management
# Clear specific date's daily challenge (replace date as needed)
psql -d tag_challenge -c "DELETE FROM daily_results WHERE date = '2025-10-08'; DELETE FROM daily_challenges WHERE date = '2025-10-08';"
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
- `GET /api/stats` - System statistics

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