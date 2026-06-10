-- Extend notifications
ALTER TABLE `notifications`
  ADD COLUMN `type` VARCHAR(50) NULL AFTER `user_id`,
  ADD COLUMN `link` VARCHAR(512) NULL AFTER `content`;

CREATE INDEX `notifications_type_created_at_idx` ON `notifications`(`type`, `created_at`);

-- Activity log
CREATE TABLE `activity_logs` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `message` TEXT NOT NULL,
  `user_id` INTEGER UNSIGNED NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `activity_logs_created_at_idx`(`created_at` DESC),
  CONSTRAINT `activity_logs_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
