-- Spotify per-episode sync fields
ALTER TABLE `episodes`
  ADD COLUMN `spotify_episode_id` VARCHAR(100) NULL AFTER `spotify_episode_url`,
  ADD COLUMN `last_spotify_sync` TIMESTAMP NULL AFTER `spotify_publication_date`;

CREATE INDEX `episodes_spotify_episode_id_idx` ON `episodes` (`spotify_episode_id`);
