-- CreateTable
CREATE TABLE `platform_tokens` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `platform` ENUM('youtube', 'spotify', 'tiktok', 'instagram') NOT NULL,
    `access_token` TEXT NOT NULL,
    `refresh_token` TEXT NULL,
    `expires_at` DATETIME(3) NULL,
    `scope` VARCHAR(512) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `platform_tokens_platform_key`(`platform`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `platform_stats` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `platform` ENUM('youtube', 'spotify', 'tiktok', 'instagram') NOT NULL,
    `metric_key` VARCHAR(100) NOT NULL,
    `metric_value` DECIMAL(18, 4) NOT NULL,
    `recorded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `platform_stats_platform_metric_key_recorded_at_idx`(`platform`, `metric_key`, `recorded_at` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
