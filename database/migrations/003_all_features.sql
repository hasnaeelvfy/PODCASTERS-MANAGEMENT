-- ============================================================
-- Migration 003 — Prodcasters CRM
-- Appliquer dans phpMyAdmin : USE podcast_crm; puis exécuter
-- ============================================================

USE podcast_crm;

-- 1. YouTube auto stats sur episodes
ALTER TABLE episodes
  ADD COLUMN IF NOT EXISTS youtube_video_id VARCHAR(20) NULL AFTER youtube_link,
  ADD COLUMN IF NOT EXISTS youtube_views INT UNSIGNED NOT NULL DEFAULT 0 AFTER youtube_video_id,
  ADD COLUMN IF NOT EXISTS youtube_likes INT UNSIGNED NOT NULL DEFAULT 0 AFTER youtube_views,
  ADD COLUMN IF NOT EXISTS youtube_comments INT UNSIGNED NOT NULL DEFAULT 0 AFTER youtube_likes,
  ADD COLUMN IF NOT EXISTS youtube_duration INT UNSIGNED NULL COMMENT 'Durée en secondes' AFTER youtube_comments,
  ADD COLUMN IF NOT EXISTS youtube_avg_watch_time INT UNSIGNED NULL COMMENT 'Temps moyen visionnage en secondes' AFTER youtube_duration,
  ADD COLUMN IF NOT EXISTS engagement_rate DECIMAL(5,2) NULL AFTER youtube_avg_watch_time,
  ADD COLUMN IF NOT EXISTS last_youtube_sync DATETIME NULL AFTER engagement_rate;

-- Index YouTube
ALTER TABLE episodes ADD INDEX IF NOT EXISTS idx_episodes_youtube_id (youtube_video_id);

-- 2. Rôle viewer par défaut
ALTER TABLE users MODIFY role ENUM('admin','editor','viewer') NOT NULL DEFAULT 'viewer';

-- 3. Table refresh tokens (sécurité sessions)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  PRIMARY KEY (id),
  KEY idx_rt_user (user_id),
  KEY idx_rt_hash (token_hash),
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
