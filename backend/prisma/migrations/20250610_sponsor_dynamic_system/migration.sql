-- Sponsor dynamic system: contracts, YouTube logs, sync queue, episode rollback fields
-- Source: database/migration_sponsors.sql (adapted for prisma migrate deploy)

-- Enrich sponsors (brand entity)
ALTER TABLE `sponsors`
  ADD COLUMN `logo_url` VARCHAR(500) NULL AFTER `name`,
  ADD COLUMN `website_url` VARCHAR(500) NULL AFTER `logo_url`,
  ADD COLUMN `niche` VARCHAR(100) NULL AFTER `website_url`;

-- Commercial contracts linked to a sponsor brand
CREATE TABLE `sponsor_contracts` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `sponsor_id` INTEGER UNSIGNED NOT NULL,
  `contract_type` ENUM(
    'per_episode',
    'monthly',
    'campaign',
    'recurring',
    'annual',
    'affiliate',
    'package'
  ) NOT NULL DEFAULT 'per_episode',
  `crm_status` ENUM(
    'prospect',
    'contacte',
    'nego',
    'confirme',
    'refuse',
    'partenaire_recurrent'
  ) NOT NULL DEFAULT 'prospect',
  `contract_status` ENUM(
    'draft',
    'active',
    'paused',
    'expired',
    'cancelled'
  ) NOT NULL DEFAULT 'draft',
  `start_date` DATE NULL,
  `end_date` DATE NULL,
  `amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'MAD',
  `commission_rate` DECIMAL(5, 2) NULL,
  `promo_message` TEXT NULL,
  `tracking_url` VARCHAR(500) NULL,
  `discount_code` VARCHAR(100) NULL,
  `youtube_description_template` TEXT NULL,
  `auto_update_youtube` BOOLEAN NOT NULL DEFAULT true,
  `notes` TEXT NULL,
  `migrated_from_sponsor_id` INTEGER UNSIGNED NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `sponsor_contracts_migrated_from_sponsor_id_key`(`migrated_from_sponsor_id`),
  INDEX `sponsor_contracts_sponsor_id_idx`(`sponsor_id`),
  INDEX `sponsor_contracts_contract_status_idx`(`contract_status`),
  INDEX `sponsor_contracts_crm_status_idx`(`crm_status`),
  INDEX `sponsor_contracts_start_date_end_date_idx`(`start_date`, `end_date`),
  INDEX `sponsor_contracts_deleted_at_idx`(`deleted_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `sponsor_contracts`
  ADD CONSTRAINT `sponsor_contracts_sponsor_id_fkey`
    FOREIGN KEY (`sponsor_id`) REFERENCES `sponsors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Episodes covered by a contract
CREATE TABLE `contract_episodes` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `contract_id` INTEGER UNSIGNED NOT NULL,
  `episode_id` INTEGER UNSIGNED NOT NULL,
  `youtube_video_id` VARCHAR(50) NULL,
  `youtube_update_status` ENUM('pending', 'success', 'failed', 'skipped') NOT NULL DEFAULT 'pending',
  `youtube_updated_at` DATETIME(3) NULL,
  `youtube_update_error` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `contract_episodes_contract_id_episode_id_key`(`contract_id`, `episode_id`),
  INDEX `contract_episodes_episode_id_idx`(`episode_id`),
  INDEX `contract_episodes_youtube_video_id_idx`(`youtube_video_id`),
  INDEX `contract_episodes_youtube_update_status_idx`(`youtube_update_status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `contract_episodes`
  ADD CONSTRAINT `contract_episodes_contract_id_fkey`
    FOREIGN KEY (`contract_id`) REFERENCES `sponsor_contracts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `contract_episodes_episode_id_fkey`
    FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- YouTube change history
CREATE TABLE `sponsor_youtube_logs` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `contract_id` INTEGER UNSIGNED NULL,
  `youtube_video_id` VARCHAR(50) NOT NULL,
  `action` ENUM(
    'description_updated',
    'comment_pinned',
    'comment_deleted',
    'rollback',
    'description_restored'
  ) NOT NULL,
  `old_description` LONGTEXT NULL,
  `new_description` LONGTEXT NULL,
  `old_comment` TEXT NULL,
  `new_comment` TEXT NULL,
  `triggered_by` ENUM(
    'manual',
    'cron',
    'contract_activation',
    'contract_expiry'
  ) NOT NULL DEFAULT 'manual',
  `success` BOOLEAN NOT NULL DEFAULT false,
  `error_message` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `sponsor_youtube_logs_contract_id_idx`(`contract_id`),
  INDEX `sponsor_youtube_logs_youtube_video_id_idx`(`youtube_video_id`),
  INDEX `sponsor_youtube_logs_action_idx`(`action`),
  INDEX `sponsor_youtube_logs_success_idx`(`success`),
  INDEX `sponsor_youtube_logs_created_at_idx`(`created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `sponsor_youtube_logs`
  ADD CONSTRAINT `sponsor_youtube_logs_contract_id_fkey`
    FOREIGN KEY (`contract_id`) REFERENCES `sponsor_contracts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Episode YouTube rollback / pinned comment
ALTER TABLE `episodes`
  ADD COLUMN `youtube_description_original` LONGTEXT NULL,
  ADD COLUMN `youtube_pinned_comment_id` VARCHAR(100) NULL;

-- YouTube operation queue (quota / retry)
CREATE TABLE `youtube_sync_queue` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `youtube_video_id` VARCHAR(50) NOT NULL,
  `contract_id` INTEGER UNSIGNED NULL,
  `action` ENUM(
    'update_description',
    'pin_comment',
    'delete_comment',
    'restore_description'
  ) NOT NULL,
  `payload` JSON NULL,
  `status` ENUM('pending', 'processing', 'done', 'failed') NOT NULL DEFAULT 'pending',
  `attempts` INTEGER UNSIGNED NOT NULL DEFAULT 0,
  `last_error` TEXT NULL,
  `scheduled_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `processed_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `youtube_sync_queue_status_idx`(`status`),
  INDEX `youtube_sync_queue_scheduled_at_idx`(`scheduled_at`),
  INDEX `youtube_sync_queue_youtube_video_id_idx`(`youtube_video_id`),
  INDEX `youtube_sync_queue_contract_id_idx`(`contract_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `youtube_sync_queue`
  ADD CONSTRAINT `youtube_sync_queue_contract_id_fkey`
    FOREIGN KEY (`contract_id`) REFERENCES `sponsor_contracts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Default currency settings (skip if already seeded)
INSERT INTO `app_settings` (`setting_key`, `setting_value`)
SELECT 'default_currency', 'MAD'
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `app_settings` WHERE `setting_key` = 'default_currency'
);

INSERT INTO `app_settings` (`setting_key`, `setting_value`)
SELECT 'supported_currencies', 'MAD,EUR'
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `app_settings` WHERE `setting_key` = 'supported_currencies'
);

-- Migrate existing sponsors → per_episode/recurring contracts (idempotent via migrated_from_sponsor_id)
INSERT INTO `sponsor_contracts` (
  `sponsor_id`,
  `contract_type`,
  `crm_status`,
  `contract_status`,
  `start_date`,
  `end_date`,
  `amount`,
  `currency`,
  `commission_rate`,
  `promo_message`,
  `tracking_url`,
  `discount_code`,
  `youtube_description_template`,
  `auto_update_youtube`,
  `notes`,
  `migrated_from_sponsor_id`,
  `created_at`,
  `updated_at`
)
SELECT
  s.`id`,
  CASE
    WHEN s.`is_recurring` = 1 OR s.`status` = 'partenaire_recurrent' THEN 'recurring'
    ELSE 'per_episode'
  END,
  CASE s.`status`
    WHEN 'prospect'              THEN 'prospect'
    WHEN 'contacte'              THEN 'contacte'
    WHEN 'nego'                  THEN 'nego'
    WHEN 'confirme'              THEN 'confirme'
    WHEN 'refuse'                THEN 'refuse'
    WHEN 'partenaire_recurrent'  THEN 'partenaire_recurrent'
    ELSE 'prospect'
  END,
  CASE
    WHEN s.`status` IN ('confirme', 'partenaire_recurrent') THEN 'active'
    WHEN s.`status` = 'refuse'                             THEN 'cancelled'
    ELSE 'draft'
  END,
  s.`start_date`,
  s.`end_date`,
  COALESCE(s.`amount`, 0.00),
  'MAD',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  s.`notes`,
  s.`id`,
  NOW(3),
  NOW(3)
FROM `sponsors` s
WHERE s.`deleted_at` IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM `sponsor_contracts` sc
    WHERE sc.`migrated_from_sponsor_id` = s.`id`
  );

INSERT INTO `contract_episodes` (
  `contract_id`,
  `episode_id`,
  `youtube_video_id`,
  `youtube_update_status`,
  `created_at`,
  `updated_at`
)
SELECT
  sc.`id`,
  s.`episode_id`,
  e.`youtube_video_id`,
  'skipped',
  NOW(3),
  NOW(3)
FROM `sponsor_contracts` sc
INNER JOIN `sponsors` s ON s.`id` = sc.`migrated_from_sponsor_id`
INNER JOIN `episodes` e ON e.`id` = s.`episode_id`
WHERE s.`deleted_at` IS NULL
  AND s.`episode_id` IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `contract_episodes` ce
    WHERE ce.`contract_id` = sc.`id` AND ce.`episode_id` = s.`episode_id`
  );
