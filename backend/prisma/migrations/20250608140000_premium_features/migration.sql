-- Sponsors extended
ALTER TABLE `sponsors`
  CHANGE COLUMN `contact` `contact_name` VARCHAR(255) NULL,
  ADD COLUMN `start_date` DATE NULL AFTER `notes`,
  ADD COLUMN `end_date` DATE NULL AFTER `start_date`,
  ADD COLUMN `is_recurring` BOOLEAN NOT NULL DEFAULT false AFTER `end_date`,
  ADD COLUMN `deleted_at` DATETIME(3) NULL AFTER `is_recurring`;

ALTER TABLE `sponsors`
  MODIFY `status` ENUM('prospect','contacte','nego','confirme','refuse','partenaire_recurrent') NOT NULL DEFAULT 'prospect';

CREATE INDEX `sponsors_status_amount_idx` ON `sponsors`(`status`, `amount`);
CREATE INDEX `sponsors_deleted_at_idx` ON `sponsors`(`deleted_at`);

-- Episodes YouTube stats
ALTER TABLE `episodes`
  ADD COLUMN `youtube_video_id` VARCHAR(20) NULL AFTER `youtube_link`,
  ADD COLUMN `youtube_views` INTEGER UNSIGNED NOT NULL DEFAULT 0 AFTER `youtube_video_id`,
  ADD COLUMN `youtube_likes` INTEGER UNSIGNED NOT NULL DEFAULT 0 AFTER `youtube_views`,
  ADD COLUMN `youtube_comments` INTEGER UNSIGNED NOT NULL DEFAULT 0 AFTER `youtube_likes`,
  ADD COLUMN `engagement_rate` DECIMAL(5, 2) NULL AFTER `youtube_comments`,
  ADD COLUMN `last_sync_at` DATETIME(3) NULL AFTER `engagement_rate`,
  ADD COLUMN `spotify_publication_date` DATE NULL AFTER `spotify_episode_url`;

CREATE INDEX `episodes_youtube_video_id_idx` ON `episodes`(`youtube_video_id`);
CREATE INDEX `episodes_publication_date_idx` ON `episodes`(`publication_date`);

-- App settings
CREATE TABLE `app_settings` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` TEXT NULL,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `app_settings_setting_key_key`(`setting_key`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES
  ('podcast_name', 'El Maakoul'),
  ('podcast_description', ''),
  ('default_currency', 'MAD'),
  ('default_language', 'fr'),
  ('timezone', 'Africa/Casablanca'),
  ('notify_shooting_reminder', 'true'),
  ('notify_sponsor_confirmed', 'true'),
  ('notify_weekly_report', 'false');
