-- =============================================================================
-- Prodcasters CRM — Migration système sponsoring dynamique YouTube
-- =============================================================================
-- Fichier     : migration_sponsors.sql
-- Usage       : Importer en une seule exécution dans phpMyAdmin (onglet SQL)
-- Sécurité    : Additif uniquement — ne supprime aucune colonne ni table existante
-- Idempotence : Les colonnes/tables déjà présentes sont ignorées ; la migration
--               de données ne s'exécute qu'une fois (via migrated_from_sponsor_id)
--
-- AVANT D'EXÉCUTER :
--   1. Faire une sauvegarde complète de la base (Export phpMyAdmin)
--   2. Décommenter et adapter la ligne USE ci-dessous si nécessaire
--   3. Vérifier que les tables sponsors, episodes existent
--
-- APRÈS IMPORT :
--   Confirmer dans le chat Cursor avant de passer à l'étape 2 (Prisma / backend)
-- =============================================================================

-- USE podcast_crm;  -- ← décommenter et remplacer par le nom de votre base

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- -----------------------------------------------------------------------------
-- Helper : exécute un ALTER uniquement si la colonne n'existe pas encore
-- (compatible MySQL 5.7+ / MariaDB 10.x, sans DELIMITER)
-- -----------------------------------------------------------------------------
-- Les blocs ci-dessous utilisent INFORMATION_SCHEMA + PREPARE pour éviter
-- les erreurs "Duplicate column name" en cas de ré-exécution partielle.

-- =============================================================================
-- SECTION 1 : Enrichir la table sponsors existante (entité MARQUE)
-- =============================================================================
-- On conserve episode_id, amount, status, sponsor_type pour compatibilité API
-- /api/sponsors existante. Les nouveaux flux passent par sponsor_contracts.

SET @db := DATABASE();

-- logo_url
SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sponsors' AND COLUMN_NAME = 'logo_url'
    ),
    'SELECT ''[SKIP] sponsors.logo_url déjà présent'' AS migration_info',
    'ALTER TABLE `sponsors` ADD COLUMN `logo_url` VARCHAR(500) NULL DEFAULT NULL AFTER `name`'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- website_url
SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sponsors' AND COLUMN_NAME = 'website_url'
    ),
    'SELECT ''[SKIP] sponsors.website_url déjà présent'' AS migration_info',
    'ALTER TABLE `sponsors` ADD COLUMN `website_url` VARCHAR(500) NULL DEFAULT NULL AFTER `logo_url`'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- niche
SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sponsors' AND COLUMN_NAME = 'niche'
    ),
    'SELECT ''[SKIP] sponsors.niche déjà présent'' AS migration_info',
    'ALTER TABLE `sponsors` ADD COLUMN `niche` VARCHAR(100) NULL DEFAULT NULL AFTER `website_url`'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- NOTE : contact_name, email, phone existent déjà (migration premium_features).
-- NOTE : sponsor_type reste l'enum placement pub (preroll, midroll, …).
--        Le type commercial (monthly, campaign, …) vit dans sponsor_contracts.

-- =============================================================================
-- SECTION 2 : Nouvelle table sponsor_contracts
-- =============================================================================

CREATE TABLE IF NOT EXISTS `sponsor_contracts` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sponsor_id` INT UNSIGNED NOT NULL,

  -- Type commercial du contrat
  `contract_type` ENUM(
    'per_episode',
    'monthly',
    'campaign',
    'recurring',
    'annual',
    'affiliate',
    'package'
  ) NOT NULL DEFAULT 'per_episode',

  -- Pipeline CRM (séparé du cycle de vie contrat)
  `crm_status` ENUM(
    'prospect',
    'contacte',
    'nego',
    'confirme',
    'refuse',
    'partenaire_recurrent'
  ) NOT NULL DEFAULT 'prospect',

  -- Cycle de vie du contrat
  `contract_status` ENUM(
    'draft',
    'active',
    'paused',
    'expired',
    'cancelled'
  ) NOT NULL DEFAULT 'draft',

  `start_date` DATE NULL DEFAULT NULL,
  `end_date` DATE NULL DEFAULT NULL,

  -- Financier (MAD par défaut, EUR possible)
  `amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'MAD',
  `commission_rate` DECIMAL(5, 2) NULL DEFAULT NULL
    COMMENT 'Pourcentage si contract_type=affiliate (ex: 10.00 = 10%)',

  -- Contenu injecté sur YouTube
  `promo_message` TEXT NULL,
  `tracking_url` VARCHAR(500) NULL DEFAULT NULL,
  `discount_code` VARCHAR(100) NULL DEFAULT NULL,
  `youtube_description_template` TEXT NULL
    COMMENT 'Variables: {sponsor_name} {promo_message} {tracking_url} {discount_code}',

  `auto_update_youtube` TINYINT(1) NOT NULL DEFAULT 1,

  `notes` TEXT NULL,

  -- Traçabilité migration depuis l''ancienne table sponsors (1:1 à l''import)
  `migrated_from_sponsor_id` INT UNSIGNED NULL DEFAULT NULL
    COMMENT 'ID de la ligne sponsors d''origine — évite double migration',

  `deleted_at` DATETIME NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sponsor_contracts_migrated_from` (`migrated_from_sponsor_id`),
  KEY `idx_sponsor_contracts_sponsor_id` (`sponsor_id`),
  KEY `idx_sponsor_contracts_contract_status` (`contract_status`),
  KEY `idx_sponsor_contracts_crm_status` (`crm_status`),
  KEY `idx_sponsor_contracts_dates` (`start_date`, `end_date`),
  KEY `idx_sponsor_contracts_deleted_at` (`deleted_at`),

  CONSTRAINT `fk_sponsor_contracts_sponsor`
    FOREIGN KEY (`sponsor_id`) REFERENCES `sponsors` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Contrats commerciaux liés à une marque sponsor';

-- =============================================================================
-- SECTION 3 : Nouvelle table contract_episodes
-- =============================================================================

CREATE TABLE IF NOT EXISTS `contract_episodes` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `contract_id` INT UNSIGNED NOT NULL,
  `episode_id` INT UNSIGNED NOT NULL,
  `youtube_video_id` VARCHAR(50) NULL DEFAULT NULL,

  `youtube_update_status` ENUM('pending', 'success', 'failed', 'skipped')
    NOT NULL DEFAULT 'pending',
  `youtube_updated_at` DATETIME NULL DEFAULT NULL,
  `youtube_update_error` TEXT NULL,

  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_contract_episode` (`contract_id`, `episode_id`),
  KEY `idx_contract_episodes_episode_id` (`episode_id`),
  KEY `idx_contract_episodes_youtube_video_id` (`youtube_video_id`),
  KEY `idx_contract_episodes_update_status` (`youtube_update_status`),

  CONSTRAINT `fk_contract_episodes_contract`
    FOREIGN KEY (`contract_id`) REFERENCES `sponsor_contracts` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_contract_episodes_episode`
    FOREIGN KEY (`episode_id`) REFERENCES `episodes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Épisodes couverts par un contrat sponsor';

-- =============================================================================
-- SECTION 4 : Nouvelle table sponsor_youtube_logs
-- =============================================================================

CREATE TABLE IF NOT EXISTS `sponsor_youtube_logs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `contract_id` INT UNSIGNED NULL DEFAULT NULL,
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

  `success` TINYINT(1) NOT NULL DEFAULT 0,
  `error_message` TEXT NULL,

  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_sponsor_youtube_logs_contract_id` (`contract_id`),
  KEY `idx_sponsor_youtube_logs_video_id` (`youtube_video_id`),
  KEY `idx_sponsor_youtube_logs_action` (`action`),
  KEY `idx_sponsor_youtube_logs_success` (`success`),
  KEY `idx_sponsor_youtube_logs_created_at` (`created_at`),

  CONSTRAINT `fk_sponsor_youtube_logs_contract`
    FOREIGN KEY (`contract_id`) REFERENCES `sponsor_contracts` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Historique des mises à jour YouTube liées au sponsoring';

-- =============================================================================
-- SECTION 5 : Enrichir la table episodes (rollback + commentaire épinglé)
-- =============================================================================

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'episodes' AND COLUMN_NAME = 'youtube_description_original'
    ),
    'SELECT ''[SKIP] episodes.youtube_description_original déjà présent'' AS migration_info',
    'ALTER TABLE `episodes` ADD COLUMN `youtube_description_original` LONGTEXT NULL DEFAULT NULL
      COMMENT ''Description YouTube originale avant injection sponsor (rollback)'''
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'episodes' AND COLUMN_NAME = 'youtube_pinned_comment_id'
    ),
    'SELECT ''[SKIP] episodes.youtube_pinned_comment_id déjà présent'' AS migration_info',
    'ALTER TABLE `episodes` ADD COLUMN `youtube_pinned_comment_id` VARCHAR(100) NULL DEFAULT NULL
      COMMENT ''ID du commentaire sponsor épinglé sur YouTube'''
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =============================================================================
-- SECTION 6 : File d''attente YouTube (alternative légère sans Redis)
-- =============================================================================

CREATE TABLE IF NOT EXISTS `youtube_sync_queue` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `youtube_video_id` VARCHAR(50) NOT NULL,
  `contract_id` INT UNSIGNED NULL DEFAULT NULL,

  `action` ENUM(
    'update_description',
    'pin_comment',
    'delete_comment',
    'restore_description'
  ) NOT NULL,

  `payload` JSON NULL COMMENT 'Données nécessaires pour exécuter l''action',

  `status` ENUM('pending', 'processing', 'done', 'failed') NOT NULL DEFAULT 'pending',
  `attempts` INT UNSIGNED NOT NULL DEFAULT 0,
  `last_error` TEXT NULL,

  `scheduled_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_at` DATETIME NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_youtube_sync_queue_status` (`status`),
  KEY `idx_youtube_sync_queue_scheduled_at` (`scheduled_at`),
  KEY `idx_youtube_sync_queue_video_id` (`youtube_video_id`),
  KEY `idx_youtube_sync_queue_contract_id` (`contract_id`),

  CONSTRAINT `fk_youtube_sync_queue_contract`
    FOREIGN KEY (`contract_id`) REFERENCES `sponsor_contracts` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='File d''attente des opérations YouTube (quota / retry)';

-- =============================================================================
-- SECTION 7 : Paramètre devise par défaut (si absent)
-- =============================================================================

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

-- =============================================================================
-- SECTION 8 : MIGRATION DES DONNÉES EXISTANTES
-- =============================================================================
-- Chaque ligne sponsors (non supprimée) → 1 contrat + 1 lien contract_episodes
-- Idempotent grâce à migrated_from_sponsor_id (UNIQUE)

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
  s.`id` AS `sponsor_id`,

  CASE
    WHEN s.`is_recurring` = 1 OR s.`status` = 'partenaire_recurrent' THEN 'recurring'
    ELSE 'per_episode'
  END AS `contract_type`,

  CASE s.`status`
    WHEN 'prospect'              THEN 'prospect'
    WHEN 'contacte'              THEN 'contacte'
    WHEN 'nego'                  THEN 'nego'
    WHEN 'confirme'              THEN 'confirme'
    WHEN 'refuse'                THEN 'refuse'
    WHEN 'partenaire_recurrent'  THEN 'partenaire_recurrent'
    ELSE 'prospect'
  END AS `crm_status`,

  CASE
    WHEN s.`status` IN ('confirme', 'partenaire_recurrent') THEN 'active'
    WHEN s.`status` = 'refuse'                             THEN 'cancelled'
    ELSE 'draft'
  END AS `contract_status`,

  s.`start_date`,
  s.`end_date`,
  COALESCE(s.`amount`, 0.00) AS `amount`,
  'MAD' AS `currency`,
  NULL AS `commission_rate`,
  NULL AS `promo_message`,
  NULL AS `tracking_url`,
  NULL AS `discount_code`,
  NULL AS `youtube_description_template`,
  0 AS `auto_update_youtube`,
  s.`notes`,
  s.`id` AS `migrated_from_sponsor_id`,
  NOW() AS `created_at`,
  NOW() AS `updated_at`

FROM `sponsors` s
WHERE s.`deleted_at` IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM `sponsor_contracts` sc
    WHERE sc.`migrated_from_sponsor_id` = s.`id`
  );

-- Lier chaque contrat migré à son épisode d''origine + youtube_video_id
INSERT INTO `contract_episodes` (
  `contract_id`,
  `episode_id`,
  `youtube_video_id`,
  `youtube_update_status`,
  `created_at`,
  `updated_at`
)
SELECT
  sc.`id` AS `contract_id`,
  s.`episode_id`,
  e.`youtube_video_id`,
  'skipped' AS `youtube_update_status`,
  NOW() AS `created_at`,
  NOW() AS `updated_at`
FROM `sponsor_contracts` sc
INNER JOIN `sponsors` s
  ON s.`id` = sc.`migrated_from_sponsor_id`
INNER JOIN `episodes` e
  ON e.`id` = s.`episode_id`
WHERE s.`deleted_at` IS NULL
  AND s.`episode_id` IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM `contract_episodes` ce
    WHERE ce.`contract_id` = sc.`id`
      AND ce.`episode_id` = s.`episode_id`
  );

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- SECTION 9 : Vérifications post-migration (lecture seule)
-- =============================================================================

SELECT 'sponsors' AS `table_name`, COUNT(*) AS `row_count` FROM `sponsors` WHERE `deleted_at` IS NULL
UNION ALL
SELECT 'sponsor_contracts', COUNT(*) FROM `sponsor_contracts` WHERE `deleted_at` IS NULL
UNION ALL
SELECT 'contract_episodes', COUNT(*) FROM `contract_episodes`
UNION ALL
SELECT 'sponsor_youtube_logs', COUNT(*) FROM `sponsor_youtube_logs`
UNION ALL
SELECT 'youtube_sync_queue', COUNT(*) FROM `youtube_sync_queue`;

-- Contrats migrés sans épisode lié (à investiguer si > 0)
SELECT
  sc.`id` AS `contract_id`,
  sc.`sponsor_id`,
  sc.`migrated_from_sponsor_id`,
  sc.`contract_status`,
  sc.`crm_status`
FROM `sponsor_contracts` sc
LEFT JOIN `contract_episodes` ce ON ce.`contract_id` = sc.`id`
WHERE sc.`migrated_from_sponsor_id` IS NOT NULL
  AND ce.`id` IS NULL;

-- =============================================================================
-- FIN — Confirmer l''import dans Cursor avant l''étape 2 (Prisma + backend)
-- =============================================================================
