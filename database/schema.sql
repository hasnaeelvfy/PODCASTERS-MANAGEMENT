-- ============================================================
-- Prodcasters CRM — Script SQL complet MySQL 8+
-- Exécutable directement : mysql -u root -p < database/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS podcast_crm
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE podcast_crm;

-- ------------------------------------------------------------
-- users
-- ------------------------------------------------------------
CREATE TABLE users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  fullname      VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar        VARCHAR(512) NULL DEFAULT NULL,
  role          ENUM('admin', 'editor', 'viewer') NOT NULL DEFAULT 'editor',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email),
  KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- pipeline_stages
-- ------------------------------------------------------------
CREATE TABLE pipeline_stages (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name      VARCHAR(100) NOT NULL,
  color     VARCHAR(7) NOT NULL DEFAULT '#8B5CF6',
  position  INT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_pipeline_stages_position (position),
  KEY idx_pipeline_stages_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- guests
-- ------------------------------------------------------------
CREATE TABLE guests (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  first_name       VARCHAR(100) NOT NULL DEFAULT '',
  last_name        VARCHAR(100) NOT NULL DEFAULT '',
  company          VARCHAR(255) NULL DEFAULT NULL,
  sector           VARCHAR(255) NULL DEFAULT NULL,
  city             VARCHAR(100) NULL DEFAULT NULL,
  source           VARCHAR(255) NULL DEFAULT NULL,
  contact          VARCHAR(500) NULL DEFAULT NULL,
  language         ENUM('mixte', 'francais', 'darija', 'adefini') NOT NULL DEFAULT 'adefini',
  stage_id         INT UNSIGNED NOT NULL,
  shooting_date    DATETIME NULL DEFAULT NULL,
  why_elmaakoul    TEXT NULL,
  emotional_angle  TEXT NULL,
  notes            TEXT NULL,
  legacy_id        VARCHAR(50) NULL DEFAULT NULL COMMENT 'ID from JSONBin migration',
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_guests_stage_id (stage_id),
  KEY idx_guests_shooting_date (shooting_date),
  KEY idx_guests_legacy_id (legacy_id),
  KEY idx_guests_name (last_name, first_name),
  CONSTRAINT fk_guests_stage
    FOREIGN KEY (stage_id) REFERENCES pipeline_stages (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- interactions
-- ------------------------------------------------------------
CREATE TABLE interactions (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  guest_id   INT UNSIGNED NOT NULL,
  note       TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_interactions_guest_created (guest_id, created_at DESC),
  CONSTRAINT fk_interactions_guest
    FOREIGN KEY (guest_id) REFERENCES guests (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- episodes
-- ------------------------------------------------------------
CREATE TABLE episodes (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  guest_id         INT UNSIGNED NOT NULL,
  episode_number   INT NULL DEFAULT NULL,
  title            VARCHAR(500) NULL DEFAULT NULL,
  recording_date   DATE NULL DEFAULT NULL,
  publication_date DATE NULL DEFAULT NULL,
  spotify_link     VARCHAR(512) NULL DEFAULT NULL,
  youtube_link     VARCHAR(512) NULL DEFAULT NULL,
  listens          INT UNSIGNED NOT NULL DEFAULT 0,
  views            INT UNSIGNED NOT NULL DEFAULT 0,
  shares           INT UNSIGNED NOT NULL DEFAULT 0,
  completion_rate  DECIMAL(5,2) NULL DEFAULT NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_episodes_guest_id (guest_id),
  KEY idx_episodes_publication_date (publication_date),
  KEY idx_episodes_listens (listens),
  CONSTRAINT fk_episodes_guest
    FOREIGN KEY (guest_id) REFERENCES guests (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_episodes_completion
    CHECK (completion_rate IS NULL OR (completion_rate >= 0 AND completion_rate <= 100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- shorts
-- ------------------------------------------------------------
CREATE TABLE shorts (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  episode_id INT UNSIGNED NOT NULL,
  platform   ENUM('yt_shorts', 'instagram', 'tiktok', 'linkedin', 'facebook') NOT NULL,
  title      VARCHAR(500) NULL DEFAULT NULL,
  views      INT UNSIGNED NOT NULL DEFAULT 0,
  likes      INT UNSIGNED NOT NULL DEFAULT 0,
  shares     INT UNSIGNED NOT NULL DEFAULT 0,
  url        VARCHAR(512) NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_shorts_episode_id (episode_id),
  KEY idx_shorts_platform (platform),
  CONSTRAINT fk_shorts_episode
    FOREIGN KEY (episode_id) REFERENCES episodes (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- sponsors
-- ------------------------------------------------------------
CREATE TABLE sponsors (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  episode_id   INT UNSIGNED NOT NULL,
  name         VARCHAR(255) NOT NULL DEFAULT '',
  sponsor_type ENUM('preroll', 'midroll', 'postroll', 'mention', 'partenaire') NOT NULL DEFAULT 'mention',
  amount       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status       ENUM('prospect', 'nego', 'confirme', 'paye') NOT NULL DEFAULT 'prospect',
  notes        TEXT NULL,
  PRIMARY KEY (id),
  KEY idx_sponsors_episode_id (episode_id),
  KEY idx_sponsors_status (status),
  CONSTRAINT fk_sponsors_episode
    FOREIGN KEY (episode_id) REFERENCES episodes (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_sponsors_amount CHECK (amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- tasks
-- ------------------------------------------------------------
CREATE TABLE tasks (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  guest_id     INT UNSIGNED NOT NULL,
  assigned_to  INT UNSIGNED NULL DEFAULT NULL,
  title        VARCHAR(255) NOT NULL,
  description  TEXT NULL,
  due_date     DATE NULL DEFAULT NULL,
  status       ENUM('pending', 'in_progress', 'done', 'cancelled') NOT NULL DEFAULT 'pending',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tasks_guest_id (guest_id),
  KEY idx_tasks_assigned_to (assigned_to),
  KEY idx_tasks_due_date (due_date),
  KEY idx_tasks_status (status),
  CONSTRAINT fk_tasks_guest
    FOREIGN KEY (guest_id) REFERENCES guests (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_tasks_assigned
    FOREIGN KEY (assigned_to) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- notifications
-- ------------------------------------------------------------
CREATE TABLE notifications (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  title      VARCHAR(255) NOT NULL,
  content    TEXT NOT NULL,
  is_read    TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_user_read (user_id, is_read),
  KEY idx_notifications_created (created_at DESC),
  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Seed: pipeline stages (mapping legacy keys)
-- ------------------------------------------------------------
INSERT INTO pipeline_stages (name, color, position) VALUES
  ('Idée',          '#888780', 1),
  ('Contacté',      '#378ADD', 2),
  ('En discussion', '#BA7517', 3),
  ('Confirmé',      '#1D9E75', 4),
  ('Enregistré',    '#7F77DD', 5),
  ('Publié',        '#639922', 6);
