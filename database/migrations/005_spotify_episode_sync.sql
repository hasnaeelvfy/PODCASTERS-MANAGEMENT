-- Spotify per-episode sync fields
ALTER TABLE `episodes`
  ADD COLUMN IF NOT EXISTS `spotify_episode_id` VARCHAR(100) NULL AFTER `spotify_episode_url`,
  ADD COLUMN IF NOT EXISTS `last_spotify_sync` TIMESTAMP NULL AFTER `spotify_publication_date`;

CREATE INDEX IF NOT EXISTS `episodes_spotify_episode_id_idx` ON `episodes` (`spotify_episode_id`);
