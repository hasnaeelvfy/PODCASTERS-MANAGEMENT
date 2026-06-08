-- Add sponsor contact fields and refuse status
ALTER TABLE sponsors
  ADD COLUMN contact VARCHAR(255) NULL DEFAULT NULL AFTER name,
  ADD COLUMN email VARCHAR(255) NULL DEFAULT NULL AFTER contact,
  ADD COLUMN phone VARCHAR(50) NULL DEFAULT NULL AFTER email,
  MODIFY status ENUM('prospect', 'nego', 'confirme', 'paye', 'refuse') NOT NULL DEFAULT 'prospect';
