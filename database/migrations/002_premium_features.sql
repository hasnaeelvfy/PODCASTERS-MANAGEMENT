-- Prodcasters CRM — Premium features migration
USE podcast_crm;

-- 1. Sponsors — extended fields + new statuses + soft delete
ALTER TABLE sponsors
  CHANGE COLUMN contact contact_name VARCHAR(255) NULL DEFAULT NULL,
  ADD COLUMN start_date DATE NULL DEFAULT NULL AFTER notes,
  ADD COLUMN end_date DATE NULL DEFAULT NULL AFTER start_date,
  ADD COLUMN is_recurring BOOLEAN NOT NULL DEFAULT FALSE AFTER end_date,
  ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL AFTER is_recurring;

ALTER TABLE sponsors
  MODIFY status ENUM('prospect','contacte','nego','confirme','refuse','partenaire_recurrent')
  NOT NULL DEFAULT 'prospect';

ALTER TABLE sponsors ADD INDEX idx_sponsors_status_amount (status, amount);
ALTER TABLE sponsors ADD INDEX idx_sponsors_deleted_at (deleted_at);

-- 2. Episodes — YouTube stats fields
ALTER TABLE episodes
  ADD COLUMN youtube_video_id VARCHAR(20) NULL DEFAULT NULL AFTER youtube_link,
  ADD COLUMN youtube_views INT UNSIGNED NOT NULL DEFAULT 0 AFTER youtube_video_id,
  ADD COLUMN youtube_likes INT UNSIGNED NOT NULL DEFAULT 0 AFTER youtube_views,
  ADD COLUMN youtube_comments INT UNSIGNED NOT NULL DEFAULT 0 AFTER youtube_likes,
  ADD COLUMN engagement_rate DECIMAL(5,2) NULL DEFAULT NULL AFTER youtube_comments,
  ADD COLUMN last_sync_at DATETIME NULL DEFAULT NULL AFTER engagement_rate,
  ADD COLUMN spotify_publication_date DATE NULL DEFAULT NULL AFTER spotify_episode_url;

ALTER TABLE episodes ADD INDEX idx_episodes_youtube_id (youtube_video_id);
ALTER TABLE episodes ADD INDEX idx_episodes_pub_date (publication_date);

-- 3. App settings
CREATE TABLE IF NOT EXISTS app_settings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_settings_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES
  ('podcast_name', 'El Maakoul'),
  ('podcast_description', ''),
  ('podcast_logo', NULL),
  ('default_currency', 'MAD'),
  ('default_language', 'fr'),
  ('timezone', 'Africa/Casablanca'),
  ('youtube_api_key', NULL),
  ('spotify_channel_url', NULL),
  ('notification_email', NULL),
  ('notify_shooting_reminder', 'true'),
  ('notify_sponsor_confirmed', 'true'),
  ('notify_weekly_report', 'false');
