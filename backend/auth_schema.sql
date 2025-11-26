-- E621 Guessr Authentication Schema
-- This file contains all new tables needed for user authentication
-- Run this after your existing database is set up

-- Users table - core user account information
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    profile_picture_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    verification_expires TIMESTAMP,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    
    -- Constraints
    CONSTRAINT username_length CHECK (char_length(username) >= 3),
    CONSTRAINT username_format CHECK (username ~* '^[a-zA-Z0-9_]+$'),
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- User sessions for JWT token management
CREATE TABLE user_sessions (
    token VARCHAR(512) PRIMARY KEY,  -- Increased from 255 to handle JWT tokens
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used TIMESTAMP DEFAULT NOW(),
    user_agent TEXT, -- Track browser/device for security
    ip_address INET  -- Track IP for security
);

-- User statistics - migrated from localStorage
CREATE TABLE user_stats (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    games_played INTEGER DEFAULT 0,
    total_score BIGINT DEFAULT 0,
    best_score INTEGER DEFAULT 0,
    average_score DECIMAL(10,2) DEFAULT 0,
    total_tags_guessed INTEGER DEFAULT 0,
    accuracy_rate DECIMAL(5,4) DEFAULT 0,
    daily_challenges_completed INTEGER DEFAULT 0,
    best_tag JSONB, -- {tag: string, category: string, score: number}
    favorite_categories JSONB DEFAULT '[]', -- Array of category names
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints to ensure data integrity
    CONSTRAINT positive_games_played CHECK (games_played >= 0),
    CONSTRAINT positive_total_score CHECK (total_score >= 0),
    CONSTRAINT positive_best_score CHECK (best_score >= 0),
    CONSTRAINT valid_accuracy_rate CHECK (accuracy_rate >= 0 AND accuracy_rate <= 1)
);

-- Add user_id to existing daily_results table for linking authenticated users
-- Keep player_name for backward compatibility with anonymous users
ALTER TABLE daily_results ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_verification_token ON users(verification_token) WHERE verification_token IS NOT NULL;
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_daily_results_user_id ON daily_results(user_id) WHERE user_id IS NOT NULL;

-- Function to update user_stats.updated_at automatically
CREATE OR REPLACE FUNCTION update_user_stats_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic timestamp updates
CREATE TRIGGER user_stats_update_timestamp
    BEFORE UPDATE ON user_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats_timestamp();

-- Function to clean up expired sessions (call this periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired verification tokens (call this periodically)  
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE users SET 
        verification_token = NULL,
        verification_expires = NULL
    WHERE verification_expires < NOW() AND verification_token IS NOT NULL;
    
    UPDATE users SET
        password_reset_token = NULL,
        password_reset_expires = NULL
    WHERE password_reset_expires < NOW() AND password_reset_token IS NOT NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;