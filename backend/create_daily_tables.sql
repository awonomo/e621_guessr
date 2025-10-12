-- Create daily challenge tables only
-- Run this manually if db init is failing

-- Drop any conflicting indexes first
DROP INDEX IF EXISTS idx_daily_challenges_date;
DROP INDEX IF EXISTS idx_daily_results_date;
DROP INDEX IF EXISTS idx_daily_results_score;

-- Drop existing tables if they exist (to avoid conflicts)
DROP TABLE IF EXISTS daily_results;
DROP TABLE IF EXISTS daily_challenges;

-- Daily challenges table
CREATE TABLE daily_challenges (
    date DATE PRIMARY KEY,
    posts JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily challenge results table  
CREATE TABLE daily_results (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    player_name VARCHAR(255) NOT NULL,
    score INTEGER NOT NULL,
    rounds JSONB NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one submission per player per day
    UNIQUE(date, player_name)
);

-- Daily blacklist tags table for content filtering
CREATE TABLE daily_blacklist_tags (
    id SERIAL PRIMARY KEY,
    tag VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_daily_challenges_date ON daily_challenges(date);
CREATE INDEX idx_daily_results_date ON daily_results(date);
CREATE INDEX idx_daily_results_score ON daily_results(date, score DESC);
CREATE INDEX idx_daily_blacklist_tags_tag ON daily_blacklist_tags(tag);