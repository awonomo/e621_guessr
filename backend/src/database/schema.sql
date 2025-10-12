-- E6 Tag Challenge Database Schema
-- PostgreSQL Schema for tag scoring system

-- Enable extensions for better text search and UUID support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "fuzzystrmatch";

-- Tags table for storing e621 tag data
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  category INTEGER NOT NULL, -- 0=General, 1=Artist, 2=Contributor, 3=Copyright, 4=Character, 5=Species, 6=Invalid, 7=Meta, 8=Lore
  post_count INTEGER DEFAULT 0,
  quality DECIMAL(3,2) DEFAULT 1.0, -- Quality multiplier (0.1 to 2.0)
  manual_score INTEGER NULL, -- Manual override score (Layer 1)
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);
CREATE INDEX IF NOT EXISTS idx_tags_post_count ON tags(post_count);
CREATE INDEX IF NOT EXISTS idx_tags_quality ON tags(quality);

-- Tag aliases table - for handling similar/alternative spellings
CREATE TABLE IF NOT EXISTS tag_aliases (
    id SERIAL PRIMARY KEY,
    antecedent_name VARCHAR(255) NOT NULL, -- What user types
    consequent_name VARCHAR(255) NOT NULL, -- What it maps to
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key to tags table
    FOREIGN KEY (consequent_name) REFERENCES tags(name) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT valid_status CHECK (status IN ('active', 'deleted', 'pending'))
);

-- Game sessions table - for tracking games and statistics
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    settings JSONB NOT NULL, -- Store game settings as JSON
    total_score INTEGER NOT NULL DEFAULT 0,
    rounds_completed INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    is_daily_challenge BOOLEAN DEFAULT FALSE,
    daily_challenge_date DATE,
    
    CONSTRAINT valid_rounds CHECK (rounds_completed >= 0)
);

-- Game rounds table - individual round data
CREATE TABLE IF NOT EXISTS game_rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    post_data JSONB NOT NULL, -- Store post metadata
    time_limit INTEGER NOT NULL,
    time_remaining INTEGER NOT NULL DEFAULT 0,
    score INTEGER NOT NULL DEFAULT 0,
    total_guesses INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    
    UNIQUE(session_id, round_number)
);

-- Correct guesses table - track what tags were guessed correctly
CREATE TABLE IF NOT EXISTS correct_guesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_id UUID NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
    tag_name VARCHAR(255) NOT NULL REFERENCES tags(name) ON UPDATE CASCADE,
    guess_text VARCHAR(255) NOT NULL, -- What the user actually typed
    points_earned INTEGER NOT NULL,
    guessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User statistics table (disabled - using local storage for stats)
-- CREATE TABLE IF NOT EXISTS user_stats (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     session_identifier VARCHAR(255) UNIQUE, -- For anonymous tracking
--     games_played INTEGER DEFAULT 0,
--     total_score BIGINT DEFAULT 0,
--     best_score INTEGER DEFAULT 0,
--     total_tags_guessed INTEGER DEFAULT 0,
--     favorite_categories JSONB DEFAULT '[]',
--     daily_challenges_completed INTEGER DEFAULT 0,
--     achievements JSONB DEFAULT '[]',
--     last_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- Daily challenges table
CREATE TABLE IF NOT EXISTS daily_challenges (
    date DATE PRIMARY KEY,
    posts JSONB NOT NULL, -- Store the 5 posts as JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily challenge results table
CREATE TABLE IF NOT EXISTS daily_results (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    player_name VARCHAR(255) NOT NULL,
    score INTEGER NOT NULL,
    rounds JSONB NOT NULL, -- Store round data as JSON
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one submission per player per day
    UNIQUE(date, player_name)
);

-- Indexes for daily tables
CREATE INDEX IF NOT EXISTS idx_daily_challenges_date ON daily_challenges(date);
CREATE INDEX IF NOT EXISTS idx_daily_results_date ON daily_results(date);
CREATE INDEX IF NOT EXISTS idx_daily_results_score ON daily_results(date, score DESC);

-- Leaderboards table (disabled - using local storage for stats)
-- CREATE TABLE IF NOT EXISTS leaderboard_entries (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
--     player_identifier VARCHAR(255),
--     score INTEGER NOT NULL,
--     game_mode VARCHAR(50) NOT NULL,
--     completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     is_daily_challenge BOOLEAN DEFAULT FALSE,
--     daily_challenge_date DATE
-- );

-- Tag data refresh log
CREATE TABLE IF NOT EXISTS tag_refresh_log (
    id SERIAL PRIMARY KEY,
    refresh_date DATE NOT NULL,
    tags_processed INTEGER NOT NULL,
    aliases_processed INTEGER NOT NULL,
    duration_seconds INTEGER,
    status VARCHAR(20) DEFAULT 'completed',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);
CREATE INDEX IF NOT EXISTS idx_tags_post_count ON tags(post_count DESC);
CREATE INDEX IF NOT EXISTS idx_tags_manual_score ON tags(manual_score);
CREATE INDEX IF NOT EXISTS idx_tags_name_trgm ON tags USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_aliases_antecedent ON tag_aliases(antecedent_name);
CREATE INDEX IF NOT EXISTS idx_aliases_consequent ON tag_aliases(consequent_name);
CREATE INDEX IF NOT EXISTS idx_aliases_status ON tag_aliases(status);

CREATE INDEX IF NOT EXISTS idx_sessions_daily_challenge ON game_sessions(is_daily_challenge, daily_challenge_date);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON game_sessions(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_rounds_session ON game_rounds(session_id, round_number);
CREATE INDEX IF NOT EXISTS idx_rounds_post_id ON game_rounds(post_id);

CREATE INDEX IF NOT EXISTS idx_guesses_round ON correct_guesses(round_id);
CREATE INDEX IF NOT EXISTS idx_guesses_tag ON correct_guesses(tag_name);

-- Leaderboard indexes (disabled - using local storage for stats)
-- CREATE INDEX IF NOT EXISTS idx_leaderboard_mode_score ON leaderboard_entries(game_mode, score DESC);
-- CREATE INDEX IF NOT EXISTS idx_leaderboard_daily ON leaderboard_entries(is_daily_challenge, daily_challenge_date, score DESC);

-- Views for common queries
CREATE OR REPLACE VIEW tag_statistics AS
SELECT 
    category,
    COUNT(*) as total_tags,
    AVG(post_count) as avg_post_count,
    AVG(quality) as avg_quality,
    COUNT(CASE WHEN manual_score IS NOT NULL THEN 1 END) as manual_overrides
FROM tags 
GROUP BY category;

-- Daily leaderboard view (disabled - using local storage for stats)
-- CREATE OR REPLACE VIEW daily_leaderboard AS
-- SELECT 
--     daily_challenge_date,
--     player_identifier,
--     score,
--     completed_at,
--     ROW_NUMBER() OVER (PARTITION BY daily_challenge_date ORDER BY score DESC, completed_at ASC) as rank
-- FROM leaderboard_entries 
-- WHERE is_daily_challenge = true
-- ORDER BY daily_challenge_date DESC, score DESC;