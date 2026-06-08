-- Migration 003 — YouTube auto stats (voir 003_all_features.sql pour la version complète)
USE podcast_crm;

ALTER TABLE episodes
  ADD COLUMN youtube_video_id VARCHAR(20) NULL AFTER youtube_link,
  ADD COLUMN youtube_views INT UNSIGNED NOT NULL DEFAULT 0 AFTER youtube_video_id,
  ADD COLUMN youtube_likes INT UNSIGNED NOT NULL DEFAULT 0 AFTER youtube_views,
  ADD COLUMN youtube_comments INT UNSIGNED NOT NULL DEFAULT 0 AFTER youtube_likes,
  ADD COLUMN youtube_duration INT UNSIGNED NULL COMMENT 'Durée en secondes' AFTER youtube_comments,
  ADD COLUMN youtube_avg_watch_time INT UNSIGNED NULL COMMENT 'Temps moyen visionnage en secondes' AFTER youtube_duration,
  ADD COLUMN engagement_rate DECIMAL(5,2) NULL AFTER youtube_avg_watch_time,
  ADD COLUMN last_youtube_sync DATETIME NULL AFTER engagement_rate,
  ADD INDEX idx_episodes_youtube_id (youtube_video_id);

ALTER TABLE users MODIFY role ENUM('admin', 'editor', 'viewer') NOT NULL DEFAULT 'viewer';
