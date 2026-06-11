-- =============================================================================
-- Prodcasters CRM — Données de démonstration : sponsoring dynamique (v5)
-- =============================================================================
-- Usage       : Importer dans phpMyAdmin (onglet SQL) ou mysql CLI
-- Ré-import   : SECTION 0-BIS corrige la prod → SECTION 0 nettoie → INSERT démo
-- Prérequis   : migration 20250610_sponsor_dynamic_system + épisodes publiés
-- =============================================================================

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET collation_connection = 'utf8mb4_unicode_ci';
SET FOREIGN_KEY_CHECKS = 0;

SET @tpl_youtube := '{sponsor_name} — {promo_message} 👉 {tracking_url} Code: {discount_code}';

-- =============================================================================
-- SECTION 0-BIS : Corriger les sponsors/contrats existants (champs vides)
-- =============================================================================

UPDATE `sponsors`
SET
  `niche` = CASE
    WHEN `niche` IS NULL OR `niche` = '' THEN 'tech'
    ELSE `niche` END,
  `logo_url` = CASE
    WHEN `logo_url` IS NULL OR `logo_url` = '' THEN CONCAT('https://ui-avatars.com/api/?name=', REPLACE(`name`, ' ', '+'), '&background=random&color=fff')
    ELSE `logo_url` END,
  `website_url` = CASE
    WHEN `website_url` IS NULL OR `website_url` = '' THEN 'https://example.com'
    ELSE `website_url` END,
  `contact_name` = CASE
    WHEN `contact_name` IS NULL OR `contact_name` = '' THEN CONCAT('Contact ', `name`)
    ELSE `contact_name` END,
  `email` = CASE
    WHEN `email` IS NULL OR `email` = '' THEN CONCAT(LOWER(REPLACE(`name`, ' ', '')), '@example.ma')
    ELSE `email` END,
  `phone` = CASE
    WHEN `phone` IS NULL OR `phone` = '' THEN '+212 6 00 00 00 00'
    ELSE `phone` END,
  `notes` = CASE
    WHEN `notes` IS NULL OR `notes` = '' THEN CONCAT('[DEMO] Sponsor ', `name`)
    ELSE `notes` END
WHERE `deleted_at` IS NULL;

UPDATE `sponsor_contracts`
SET
  `promo_message` = CASE
    WHEN `promo_message` IS NULL OR `promo_message` = '' THEN 'Offre spéciale pour les auditeurs El Maakoul'
    ELSE `promo_message` END,
  `tracking_url` = CASE
    WHEN `tracking_url` IS NULL OR `tracking_url` = '' THEN 'https://example.com/elmaakoul'
    ELSE `tracking_url` END,
  `discount_code` = CASE
    WHEN `discount_code` IS NULL OR `discount_code` = '' THEN 'ELMAAKOUL'
    ELSE `discount_code` END,
  `youtube_description_template` = CASE
    WHEN `youtube_description_template` IS NULL OR `youtube_description_template` = '' THEN @tpl_youtube
    ELSE `youtube_description_template` END,
  `commission_rate` = COALESCE(`commission_rate`, 0.00),
  `currency` = CASE
    WHEN `currency` IS NULL OR `currency` = '' THEN 'MAD'
    ELSE `currency` END,
  `auto_update_youtube` = 1
WHERE `deleted_at` IS NULL;

-- -----------------------------------------------------------------------------
-- Résolution dynamique des IDs d'épisodes (ORDER BY id ASC)
-- -----------------------------------------------------------------------------
SET @ep1 := (SELECT `id` FROM `episodes` ORDER BY `id` ASC LIMIT 1 OFFSET 0);
SET @ep2 := (SELECT `id` FROM `episodes` ORDER BY `id` ASC LIMIT 1 OFFSET 1);
SET @ep3 := (SELECT `id` FROM `episodes` ORDER BY `id` ASC LIMIT 1 OFFSET 2);
SET @ep4 := (SELECT `id` FROM `episodes` ORDER BY `id` ASC LIMIT 1 OFFSET 3);
SET @ep5 := (SELECT `id` FROM `episodes` ORDER BY `id` ASC LIMIT 1 OFFSET 4);

SET @yt1 := COALESCE((SELECT `youtube_video_id` FROM `episodes` WHERE `id` = @ep1), 'lo_vGcZxq0E');
SET @yt2 := COALESCE((SELECT `youtube_video_id` FROM `episodes` WHERE `id` = @ep2), 'dQw4w9WgXcQ');
SET @yt3 := COALESCE((SELECT `youtube_video_id` FROM `episodes` WHERE `id` = @ep3), 'jNQXAC9IVRw');
SET @yt4 := COALESCE((SELECT `youtube_video_id` FROM `episodes` WHERE `id` = @ep4), 'F8B1qxoaFX4');
SET @yt5 := COALESCE((SELECT `youtube_video_id` FROM `episodes` WHERE `id` = @ep5), '9bZkp7q19f0');

-- =============================================================================
-- SECTION 0 : Nettoyage démo (ordre inverse des foreign keys)
-- =============================================================================

DELETE q FROM `youtube_sync_queue` q
INNER JOIN `sponsor_contracts` sc ON sc.`id` = q.`contract_id`
WHERE sc.`notes` LIKE '%DEMO:contract:%';

DELETE l FROM `sponsor_youtube_logs` l
INNER JOIN `sponsor_contracts` sc ON sc.`id` = l.`contract_id`
WHERE sc.`notes` LIKE '%DEMO:contract:%';

DELETE ce FROM `contract_episodes` ce
INNER JOIN `sponsor_contracts` sc ON sc.`id` = ce.`contract_id`
WHERE sc.`notes` LIKE '%DEMO:contract:%';

DELETE FROM `sponsor_contracts` WHERE `notes` LIKE '%DEMO:contract:%';

DELETE FROM `sponsors`
WHERE `notes` LIKE '%DEMO]%' OR `name` = 'TECHCORP_DELETED';

-- =============================================================================
-- SECTION 1 : Sponsors (4 actifs + 1 soft-deleted — tous champs remplis)
-- =============================================================================

-- 1. JADARA — tech — partenaire récurrent
INSERT INTO `sponsors` (
  `episode_id`, `name`, `niche`, `contact_name`, `email`, `phone`,
  `sponsor_type`, `amount`, `status`, `start_date`, `end_date`,
  `is_recurring`, `notes`, `logo_url`, `website_url`, `deleted_at`
)
SELECT @ep1, 'JADARA', 'tech', 'Karim Benjelloun', 'partenariats@jadara.ma', '+212 6 12 34 56 78',
  'partenaire', 5000.00, 'partenaire_recurrent', '2026-06-01', '2026-06-30', 1,
  '[DEMO] Marque tech — partenaire récurrent El Maakoul',
  'https://ui-avatars.com/api/?name=JADARA&background=random&color=fff',
  'https://jadara.ma', NULL
FROM DUAL WHERE @ep1 IS NOT NULL;

-- 2. DARKOM — telecom — confirmé
INSERT INTO `sponsors` (
  `episode_id`, `name`, `niche`, `contact_name`, `email`, `phone`,
  `sponsor_type`, `amount`, `status`, `start_date`, `end_date`,
  `is_recurring`, `notes`, `logo_url`, `website_url`, `deleted_at`
)
SELECT @ep2, 'DARKOM', 'telecom', 'Sara El Amrani', 'sponsoring@darkom.ma', '+212 5 22 00 11 22',
  'midroll', 8000.00, 'confirme', '2026-09-01', '2026-09-30', 0,
  '[DEMO] Marque telecom — contrat mensuel septembre 2026',
  'https://ui-avatars.com/api/?name=DARKOM&background=random&color=fff',
  'https://darkom.ma', NULL
FROM DUAL WHERE @ep2 IS NOT NULL;

-- 3. NAMSHI — fashion — affiliation (amount 0 autorisé)
INSERT INTO `sponsors` (
  `episode_id`, `name`, `niche`, `contact_name`, `email`, `phone`,
  `sponsor_type`, `amount`, `status`, `start_date`, `end_date`,
  `is_recurring`, `notes`, `logo_url`, `website_url`, `deleted_at`
)
SELECT @ep3, 'NAMSHI', 'fashion', 'Laila Mansouri', 'influence@namshi.com', '+971 4 000 0000',
  'partenaire', 0.00, 'confirme', '2026-01-01', NULL, 0,
  '[DEMO] Marque fashion — programme affiliation 10%',
  'https://ui-avatars.com/api/?name=NAMSHI&background=random&color=fff',
  'https://www.namshi.com', NULL
FROM DUAL WHERE @ep3 IS NOT NULL;

-- 4. INWI — telecom — en négociation
INSERT INTO `sponsors` (
  `episode_id`, `name`, `niche`, `contact_name`, `email`, `phone`,
  `sponsor_type`, `amount`, `status`, `start_date`, `end_date`,
  `is_recurring`, `notes`, `logo_url`, `website_url`, `deleted_at`
)
SELECT @ep4, 'INWI', 'telecom', 'Youssef Tazi', 'brand@inwi.ma', '+212 5 20 00 33 44',
  'mention', 12000.00, 'nego', '2026-10-01', '2026-12-31', 0,
  '[DEMO] Marque telecom — package en négociation Q4 2026',
  'https://ui-avatars.com/api/?name=INWI&background=random&color=fff',
  'https://www.inwi.ma', NULL
FROM DUAL WHERE @ep4 IS NOT NULL;

-- 5. TECHCORP_DELETED — soft delete (badge masqué)
INSERT INTO `sponsors` (
  `episode_id`, `name`, `niche`, `contact_name`, `email`, `phone`,
  `sponsor_type`, `amount`, `status`, `start_date`, `end_date`,
  `is_recurring`, `notes`, `logo_url`, `website_url`, `deleted_at`
)
SELECT @ep1, 'TECHCORP_DELETED', 'tech', 'Mehdi Alaoui', 'old@techcorp.ma', '+212 6 55 44 33 22',
  'preroll', 3000.00, 'confirme', '2026-01-01', '2026-12-31', 0,
  '[DEMO] Sponsor supprimé — test filtre deleted_at sur badges',
  'https://ui-avatars.com/api/?name=TECHCORP&background=random&color=fff',
  'https://techcorp.example', NOW()
FROM DUAL WHERE @ep1 IS NOT NULL;

-- IDs sponsors
SET @s_jadara := (SELECT `id` FROM `sponsors` WHERE `name` = 'JADARA' AND `notes` LIKE '%DEMO]%' AND `deleted_at` IS NULL LIMIT 1);
SET @s_darkom := (SELECT `id` FROM `sponsors` WHERE `name` = 'DARKOM' AND `notes` LIKE '%DEMO]%' AND `deleted_at` IS NULL LIMIT 1);
SET @s_namshi := (SELECT `id` FROM `sponsors` WHERE `name` = 'NAMSHI' AND `notes` LIKE '%DEMO]%' AND `deleted_at` IS NULL LIMIT 1);
SET @s_inwi := (SELECT `id` FROM `sponsors` WHERE `name` = 'INWI' AND `notes` LIKE '%DEMO]%' AND `deleted_at` IS NULL LIMIT 1);
SET @s_deleted := (SELECT `id` FROM `sponsors` WHERE `name` = 'TECHCORP_DELETED' AND `deleted_at` IS NOT NULL LIMIT 1);

-- =============================================================================
-- SECTION 2 : Contrats sponsors (6 contrats — tous champs remplis, auto_update=1)
-- =============================================================================

-- Contrat 1 — JADARA per_episode — actif
INSERT INTO `sponsor_contracts` (
  `sponsor_id`, `contract_type`, `crm_status`, `contract_status`,
  `start_date`, `end_date`, `amount`, `currency`, `commission_rate`,
  `promo_message`, `tracking_url`, `discount_code`,
  `youtube_description_template`, `auto_update_youtube`, `notes`
)
SELECT @s_jadara, 'per_episode', 'partenaire_recurrent', 'active',
  '2026-06-01', '2026-06-30', 5000.00, 'MAD', 0.00,
  'Profitez de -20% sur votre premier achat',
  'https://jadara.ma/elmaakoul?utm_source=youtube',
  'ELMAAKOUL20', @tpl_youtube, 1,
  '[DEMO:contract:jadara-per-episode] Contrat par épisode actif — juin 2026'
FROM DUAL WHERE @s_jadara IS NOT NULL;

-- Contrat 2 — DARKOM monthly — actif
INSERT INTO `sponsor_contracts` (
  `sponsor_id`, `contract_type`, `crm_status`, `contract_status`,
  `start_date`, `end_date`, `amount`, `currency`, `commission_rate`,
  `promo_message`, `tracking_url`, `discount_code`,
  `youtube_description_template`, `auto_update_youtube`, `notes`
)
SELECT @s_darkom, 'monthly', 'confirme', 'active',
  '2026-09-01', '2026-09-30', 8000.00, 'MAD', 0.00,
  'Darkom 5G — Internet fibre pour créateurs de contenu au Maroc',
  'https://darkom.ma/podcast?utm_source=elmaakoul',
  'DARKOM5G', @tpl_youtube, 1,
  '[DEMO:contract:darkom-monthly] Contrat mensuel actif — septembre 2026'
FROM DUAL WHERE @s_darkom IS NOT NULL;

-- Contrat 3 — NAMSHI affiliate — actif (end_date NULL = affiliation sans limite)
INSERT INTO `sponsor_contracts` (
  `sponsor_id`, `contract_type`, `crm_status`, `contract_status`,
  `start_date`, `end_date`, `amount`, `currency`, `commission_rate`,
  `promo_message`, `tracking_url`, `discount_code`,
  `youtube_description_template`, `auto_update_youtube`, `notes`
)
SELECT @s_namshi, 'affiliate', 'confirme', 'active',
  '2026-01-01', NULL, 0.00, 'MAD', 10.00,
  'Mode & lifestyle — 10% de commission sur chaque vente',
  'https://www.namshi.com/?utm_source=elmaakoul&ref=podcast',
  'NAMSHI10', @tpl_youtube, 1,
  '[DEMO:contract:namshi-affiliate] Programme affiliation actif'
FROM DUAL WHERE @s_namshi IS NOT NULL;

-- Contrat 4 — INWI package — brouillon
INSERT INTO `sponsor_contracts` (
  `sponsor_id`, `contract_type`, `crm_status`, `contract_status`,
  `start_date`, `end_date`, `amount`, `currency`, `commission_rate`,
  `promo_message`, `tracking_url`, `discount_code`,
  `youtube_description_template`, `auto_update_youtube`, `notes`
)
SELECT @s_inwi, 'package', 'nego', 'draft',
  '2026-10-01', '2026-12-31', 12000.00, 'MAD', 0.00,
  'Package 3 épisodes — offre exclusive auditeurs El Maakoul',
  'https://www.inwi.ma/podcast?utm_source=elmaakoul',
  'INWI2026', @tpl_youtube, 1,
  '[DEMO:contract:inwi-package] Package prospect brouillon — Q4 2026'
FROM DUAL WHERE @s_inwi IS NOT NULL;

-- Contrat 5 — JADARA campaign — brouillon
INSERT INTO `sponsor_contracts` (
  `sponsor_id`, `contract_type`, `crm_status`, `contract_status`,
  `start_date`, `end_date`, `amount`, `currency`, `commission_rate`,
  `promo_message`, `tracking_url`, `discount_code`,
  `youtube_description_template`, `auto_update_youtube`, `notes`
)
SELECT @s_jadara, 'campaign', 'nego', 'draft',
  '2027-01-01', '2027-03-31', 15000.00, 'MAD', 0.00,
  'Campagne Q1 2027 — Bootcamp entrepreneuriat digital',
  'https://jadara.ma/bootcamp-2027?utm_source=elmaakoul',
  'JADARABOOT', @tpl_youtube, 1,
  '[DEMO:contract:jadara-campaign] Campagne brouillon — T1 2027'
FROM DUAL WHERE @s_jadara IS NOT NULL;

-- Contrat 6 — TECHCORP orphelin — sponsor supprimé
INSERT INTO `sponsor_contracts` (
  `sponsor_id`, `contract_type`, `crm_status`, `contract_status`,
  `start_date`, `end_date`, `amount`, `currency`, `commission_rate`,
  `promo_message`, `tracking_url`, `discount_code`,
  `youtube_description_template`, `auto_update_youtube`, `notes`
)
SELECT @s_deleted, 'per_episode', 'confirme', 'active',
  '2026-01-01', '2026-12-31', 3000.00, 'MAD', 0.00,
  'Ancienne promo TechCorp — offre expirée',
  'https://techcorp.example/old-deal?utm_source=elmaakoul',
  'TECHOLD', @tpl_youtube, 1,
  '[DEMO:contract:techcorp-deleted-orphan] Contrat orphelin — sponsor soft-deleted'
FROM DUAL WHERE @s_deleted IS NOT NULL;

-- IDs contrats
SET @c_jadara_ep := (SELECT `id` FROM `sponsor_contracts` WHERE `notes` = '[DEMO:contract:jadara-per-episode] Contrat par épisode actif — juin 2026' LIMIT 1);
SET @c_darkom := (SELECT `id` FROM `sponsor_contracts` WHERE `notes` = '[DEMO:contract:darkom-monthly] Contrat mensuel actif — septembre 2026' LIMIT 1);
SET @c_namshi := (SELECT `id` FROM `sponsor_contracts` WHERE `notes` = '[DEMO:contract:namshi-affiliate] Programme affiliation actif' LIMIT 1);
SET @c_inwi := (SELECT `id` FROM `sponsor_contracts` WHERE `notes` = '[DEMO:contract:inwi-package] Package prospect brouillon — Q4 2026' LIMIT 1);
SET @c_jadara_camp := (SELECT `id` FROM `sponsor_contracts` WHERE `notes` = '[DEMO:contract:jadara-campaign] Campagne brouillon — T1 2027' LIMIT 1);
SET @c_deleted := (SELECT `id` FROM `sponsor_contracts` WHERE `notes` = '[DEMO:contract:techcorp-deleted-orphan] Contrat orphelin — sponsor soft-deleted' LIMIT 1);

-- =============================================================================
-- SECTION 3 : Liaisons contrat ↔ épisodes (tous champs)
-- =============================================================================

INSERT INTO `contract_episodes` (
  `contract_id`, `episode_id`, `youtube_video_id`,
  `youtube_update_status`, `youtube_updated_at`, `youtube_update_error`
)
SELECT @c_jadara_ep, @ep1, @yt1, 'success', '2026-06-05 14:30:00', NULL
FROM DUAL WHERE @c_jadara_ep IS NOT NULL AND @ep1 IS NOT NULL;

INSERT INTO `contract_episodes` (
  `contract_id`, `episode_id`, `youtube_video_id`,
  `youtube_update_status`, `youtube_updated_at`, `youtube_update_error`
)
SELECT @c_darkom, @ep2, @yt2, 'success', '2026-09-02 10:15:00', NULL
FROM DUAL WHERE @c_darkom IS NOT NULL AND @ep2 IS NOT NULL;

INSERT INTO `contract_episodes` (
  `contract_id`, `episode_id`, `youtube_video_id`,
  `youtube_update_status`, `youtube_updated_at`, `youtube_update_error`
)
SELECT @c_darkom, @ep3, @yt3, 'failed', '2026-09-03 11:20:00',
  'quotaExceeded: The request cannot be completed because you have exceeded your quota.'
FROM DUAL WHERE @c_darkom IS NOT NULL AND @ep3 IS NOT NULL;

INSERT INTO `contract_episodes` (
  `contract_id`, `episode_id`, `youtube_video_id`,
  `youtube_update_status`, `youtube_updated_at`, `youtube_update_error`
)
SELECT @c_darkom, @ep4, @yt4, 'pending', NULL, NULL
FROM DUAL WHERE @c_darkom IS NOT NULL AND @ep4 IS NOT NULL;

INSERT INTO `contract_episodes` (
  `contract_id`, `episode_id`, `youtube_video_id`,
  `youtube_update_status`, `youtube_updated_at`, `youtube_update_error`
)
SELECT @c_namshi, @ep1, @yt1, 'success', '2026-01-15 09:00:00', NULL
FROM DUAL WHERE @c_namshi IS NOT NULL AND @ep1 IS NOT NULL;

INSERT INTO `contract_episodes` (
  `contract_id`, `episode_id`, `youtube_video_id`,
  `youtube_update_status`, `youtube_updated_at`, `youtube_update_error`
)
SELECT @c_namshi, @ep2, @yt2, 'success', '2026-02-10 09:30:00', NULL
FROM DUAL WHERE @c_namshi IS NOT NULL AND @ep2 IS NOT NULL;

INSERT INTO `contract_episodes` (
  `contract_id`, `episode_id`, `youtube_video_id`,
  `youtube_update_status`, `youtube_updated_at`, `youtube_update_error`
)
SELECT @c_namshi, @ep3, @yt3, 'success', '2026-03-05 10:00:00', NULL
FROM DUAL WHERE @c_namshi IS NOT NULL AND @ep3 IS NOT NULL;

INSERT INTO `contract_episodes` (
  `contract_id`, `episode_id`, `youtube_video_id`,
  `youtube_update_status`, `youtube_updated_at`, `youtube_update_error`
)
SELECT @c_namshi, @ep4, @yt4, 'success', '2026-04-12 11:45:00', NULL
FROM DUAL WHERE @c_namshi IS NOT NULL AND @ep4 IS NOT NULL;

INSERT INTO `contract_episodes` (
  `contract_id`, `episode_id`, `youtube_video_id`,
  `youtube_update_status`, `youtube_updated_at`, `youtube_update_error`
)
SELECT @c_namshi, @ep5, @yt5, 'skipped', NULL, NULL
FROM DUAL WHERE @c_namshi IS NOT NULL AND @ep5 IS NOT NULL AND @ep5 <> @ep4;

INSERT INTO `contract_episodes` (
  `contract_id`, `episode_id`, `youtube_video_id`,
  `youtube_update_status`, `youtube_updated_at`, `youtube_update_error`
)
SELECT @c_jadara_camp, @ep3, @yt3, 'pending', NULL, NULL
FROM DUAL WHERE @c_jadara_camp IS NOT NULL AND @ep3 IS NOT NULL;

INSERT INTO `contract_episodes` (
  `contract_id`, `episode_id`, `youtube_video_id`,
  `youtube_update_status`, `youtube_updated_at`, `youtube_update_error`
)
SELECT @c_jadara_camp, @ep4, @yt4, 'pending', NULL, NULL
FROM DUAL WHERE @c_jadara_camp IS NOT NULL AND @ep4 IS NOT NULL;

INSERT INTO `contract_episodes` (
  `contract_id`, `episode_id`, `youtube_video_id`,
  `youtube_update_status`, `youtube_updated_at`, `youtube_update_error`
)
SELECT @c_deleted, @ep1, @yt1, 'success', '2026-01-20 08:00:00', NULL
FROM DUAL WHERE @c_deleted IS NOT NULL AND @ep1 IS NOT NULL;

-- =============================================================================
-- SECTION 4 : Logs YouTube (3 entrées — tous champs)
-- =============================================================================

INSERT INTO `sponsor_youtube_logs` (
  `contract_id`, `youtube_video_id`, `action`,
  `old_description`, `new_description`, `old_comment`, `new_comment`,
  `triggered_by`, `success`, `error_message`, `created_at`
)
SELECT @c_jadara_ep, @yt1, 'description_updated',
  'Description originale El Maakoul — invité, liens Spotify, réseaux sociaux.',
  CONCAT(
    'Description originale El Maakoul — invité, liens Spotify, réseaux sociaux.',
    '\n\n---\n🤝 PARTENAIRE DU MOMENT\n',
    'JADARA — Profitez de -20% sur votre premier achat 👉 https://jadara.ma/elmaakoul Code: ELMAAKOUL20'
  ),
  NULL, NULL,
  'contract_activation', 1, NULL, '2026-06-05 14:30:12'
FROM DUAL WHERE @c_jadara_ep IS NOT NULL;

INSERT INTO `sponsor_youtube_logs` (
  `contract_id`, `youtube_video_id`, `action`,
  `old_description`, `new_description`, `old_comment`, `new_comment`,
  `triggered_by`, `success`, `error_message`, `created_at`
)
SELECT @c_jadara_ep, @yt1, 'comment_pinned',
  NULL, NULL, NULL,
  '🤝 Partenaire du moment : JADARA — Code ELMAAKOUL20 → https://jadara.ma/elmaakoul',
  'contract_activation', 1, NULL, '2026-06-05 14:31:00'
FROM DUAL WHERE @c_jadara_ep IS NOT NULL;

INSERT INTO `sponsor_youtube_logs` (
  `contract_id`, `youtube_video_id`, `action`,
  `old_description`, `new_description`, `old_comment`, `new_comment`,
  `triggered_by`, `success`, `error_message`, `created_at`
)
SELECT @c_darkom, @yt3, 'description_updated',
  'Description épisode El Maakoul — invité, liens et crédits.',
  NULL, NULL, NULL,
  'cron', 0,
  'quotaExceeded: The request cannot be completed because you have exceeded your quota.',
  '2026-06-09 18:05:00'
FROM DUAL WHERE @c_darkom IS NOT NULL;

-- =============================================================================
-- SECTION 5 : File d'attente YouTube (2 entrées — tous champs)
-- =============================================================================

INSERT INTO `youtube_sync_queue` (
  `youtube_video_id`, `contract_id`, `action`, `payload`,
  `status`, `attempts`, `last_error`, `scheduled_at`, `processed_at`, `created_at`
)
SELECT @yt4, @c_darkom, 'update_description',
  JSON_OBJECT('episodeId', @ep4, 'contractId', @c_darkom, 'sponsor', 'DARKOM'),
  'pending', 0, NULL, '2026-06-10 08:00:00', NULL, '2026-06-10 07:55:00'
FROM DUAL WHERE @c_darkom IS NOT NULL AND @yt4 IS NOT NULL;

INSERT INTO `youtube_sync_queue` (
  `youtube_video_id`, `contract_id`, `action`, `payload`,
  `status`, `attempts`, `last_error`, `scheduled_at`, `processed_at`, `created_at`
)
SELECT @yt2, @c_namshi, 'pin_comment',
  JSON_OBJECT('episodeId', @ep2, 'contractId', @c_namshi, 'message', 'NAMSHI10 — -10% mode'),
  'failed', 2,
  'quotaExceeded: The request cannot be completed because you have exceeded your quota.',
  '2026-06-09 18:00:00', '2026-06-09 18:05:00', '2026-06-09 17:58:00'
FROM DUAL WHERE @c_namshi IS NOT NULL AND @yt2 IS NOT NULL;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- SECTION 6 : Vérifications post-import (COUNT par table)
-- =============================================================================

SELECT '=== Épisodes résolus ===' AS `info`;
SELECT @ep1 AS `ep1`, @ep2 AS `ep2`, @ep3 AS `ep3`, @ep4 AS `ep4`, @ep5 AS `ep5`;

SELECT 'sponsors' AS `table_name`, COUNT(*) AS `cnt`
FROM `sponsors` WHERE `notes` LIKE '%DEMO]%'
UNION ALL
SELECT 'sponsor_contracts', COUNT(*)
FROM `sponsor_contracts` WHERE `notes` LIKE '%DEMO:contract:%'
UNION ALL
SELECT 'contract_episodes', COUNT(*)
FROM `contract_episodes` ce
INNER JOIN `sponsor_contracts` sc ON sc.`id` = ce.`contract_id`
WHERE sc.`notes` LIKE '%DEMO:contract:%'
UNION ALL
SELECT 'sponsor_youtube_logs', COUNT(*)
FROM `sponsor_youtube_logs` l
INNER JOIN `sponsor_contracts` sc ON sc.`id` = l.`contract_id`
WHERE sc.`notes` LIKE '%DEMO:contract:%'
UNION ALL
SELECT 'youtube_sync_queue', COUNT(*)
FROM `youtube_sync_queue` q
INNER JOIN `sponsor_contracts` sc ON sc.`id` = q.`contract_id`
WHERE sc.`notes` LIKE '%DEMO:contract:%';

SELECT '=== Champs vides restants (doit être 0) ===' AS `info`;
SELECT COUNT(*) AS `sponsors_champs_vides`
FROM `sponsors`
WHERE `deleted_at` IS NULL
  AND (
    `niche` IS NULL OR `niche` = ''
    OR `logo_url` IS NULL OR `logo_url` = ''
    OR `website_url` IS NULL OR `website_url` = ''
    OR `contact_name` IS NULL OR `contact_name` = ''
    OR `email` IS NULL OR `email` = ''
    OR `phone` IS NULL OR `phone` = ''
  );

SELECT COUNT(*) AS `contracts_champs_vides`
FROM `sponsor_contracts`
WHERE `deleted_at` IS NULL
  AND (
    `promo_message` IS NULL OR `promo_message` = ''
    OR `tracking_url` IS NULL OR `tracking_url` = ''
    OR `discount_code` IS NULL OR `discount_code` = ''
    OR `youtube_description_template` IS NULL OR `youtube_description_template` = ''
    OR `currency` IS NULL OR `currency` = ''
  );

SELECT '=== Badges épisode 1 (sponsors non supprimés) ===' AS `info`;
SELECT s.`name`, sc.`contract_type`, sc.`contract_status`
FROM `contract_episodes` ce
INNER JOIN `sponsor_contracts` sc ON sc.`id` = ce.`contract_id`
INNER JOIN `sponsors` s ON s.`id` = sc.`sponsor_id`
WHERE ce.`episode_id` = @ep1
  AND sc.`contract_status` = 'active'
  AND sc.`deleted_at` IS NULL
  AND s.`deleted_at` IS NULL;

-- =============================================================================
-- FIN v5 — Attendu :
--   sponsors: 5 | contracts: 6 | contract_episodes: 11-12 | logs: 3 | queue: 2
--   Badges ep1 : JADARA + NAMSHI (PAS TECHCORP_DELETED)
-- =============================================================================
