-- ============================================================
-- El Maakoul Studio CRM - Database Migrations
-- Safe migration script for adding episode URLs and shorts enhancements
-- ============================================================

USE podcast_crm;

-- ------------------------------------------------------------
-- PART 1: Add new URL fields to episodes table
-- ------------------------------------------------------------
ALTER TABLE episodes 
ADD COLUMN IF NOT EXISTS youtube_episode_url VARCHAR(512) NULL DEFAULT NULL COMMENT 'Full YouTube episode link' AFTER youtube_link,
ADD COLUMN IF NOT EXISTS spotify_episode_url VARCHAR(512) NULL DEFAULT NULL COMMENT 'Spotify episode link (stored for future use)' AFTER youtube_episode_url;

-- ------------------------------------------------------------
-- PART 2: Add new fields to shorts table
-- ------------------------------------------------------------
ALTER TABLE shorts 
ADD COLUMN IF NOT EXISTS description TEXT NULL DEFAULT NULL COMMENT 'Short/reel description' AFTER url,
ADD COLUMN IF NOT EXISTS published_at DATETIME NULL DEFAULT NULL COMMENT 'Publication date' AFTER description;

-- ------------------------------------------------------------
-- PART 3: Update existing shorts data to meet NOT NULL constraints
-- ------------------------------------------------------------
-- Set default values for existing NULL data before making columns NOT NULL
UPDATE shorts SET title = 'Untitled' WHERE title IS NULL OR title = '';
UPDATE shorts SET url = 'https://example.com' WHERE url IS NULL OR url = '';
UPDATE shorts SET description = 'No description' WHERE description IS NULL OR description = '';

-- ------------------------------------------------------------
-- PART 4: Make shorts fields NOT NULL
-- ------------------------------------------------------------
ALTER TABLE shorts 
MODIFY COLUMN title VARCHAR(500) NOT NULL,
MODIFY COLUMN url VARCHAR(512) NOT NULL,
MODIFY COLUMN description TEXT NOT NULL;

-- ------------------------------------------------------------
-- PART 5: Update platform enum in shorts table
-- ------------------------------------------------------------
-- Note: MySQL does not support direct ENUM modification with ALTER TABLE
-- We need to modify the column definition
ALTER TABLE shorts 
MODIFY COLUMN platform ENUM('youtube_shorts', 'instagram_reels', 'tiktok', 'linkedin', 'facebook') NOT NULL;

-- Update existing platform values to match new enum
UPDATE shorts SET platform = 'youtube_shorts' WHERE platform = 'yt_shorts';
UPDATE shorts SET platform = 'instagram_reels' WHERE platform = 'instagram';

-- ------------------------------------------------------------
-- PART 6: Add proper indexes
-- ------------------------------------------------------------
-- Add index on platform for better query performance
ALTER TABLE shorts ADD INDEX IF NOT EXISTS idx_shorts_platform (platform);

-- Ensure episode_id index exists (it should already exist from schema.sql)
ALTER TABLE shorts ADD INDEX IF NOT EXISTS idx_shorts_episode_id (episode_id);

-- ------------------------------------------------------------
-- PART 7: Add URL validation check constraint (optional)
-- ------------------------------------------------------------
-- This is a basic check - actual URL validation should be done in application layer
ALTER TABLE episodes 
ADD CONSTRAINT chk_youtube_episode_url CHECK (youtube_episode_url IS NULL OR youtube_episode_url LIKE 'https://%'),
ADD CONSTRAINT chk_spotify_episode_url CHECK (spotify_episode_url IS NULL OR spotify_episode_url LIKE 'https://%');

ALTER TABLE shorts 
ADD CONSTRAINT chk_shorts_url CHECK (url LIKE 'https://%');

-- ============================================================
-- Migration Complete
-- ============================================================
