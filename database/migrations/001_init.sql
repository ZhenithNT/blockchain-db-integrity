-- Migration: 001_init.sql
-- Database initialization for Blockchain DB Integrity Verification MVP

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'LECTURER',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `scores` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` VARCHAR(50) NOT NULL,
  `course_code` VARCHAR(50) NOT NULL,
  `semester` VARCHAR(50) NOT NULL,
  `score` VARCHAR(10) NOT NULL,
  `version` INT NOT NULL DEFAULT 1,
  `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `record_key` VARCHAR(66) NOT NULL,
  `data_hash` VARCHAR(66) NOT NULL,
  `blockchain_status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_student_course_semester` (`student_id`, `course_code`, `semester`),
  INDEX `idx_record_key` (`record_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `score_versions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `score_id` INT NOT NULL,
  `version` INT NOT NULL,
  `score` VARCHAR(10) NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `action` VARCHAR(20) NOT NULL,
  `data_hash` VARCHAR(66) NOT NULL,
  `actor_hash` VARCHAR(66) NOT NULL,
  `transaction_hash` VARCHAR(66) DEFAULT NULL,
  `block_number` BIGINT DEFAULT NULL,
  `blockchain_timestamp` DATETIME DEFAULT NULL,
  `sync_status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_score_version` (`score_id`, `version`),
  INDEX `idx_score_id` (`score_id`),
  CONSTRAINT `fk_score_versions_score` FOREIGN KEY (`score_id`) REFERENCES `scores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `actor` VARCHAR(100) NOT NULL,
  `action` VARCHAR(50) NOT NULL,
  `target` VARCHAR(100) NOT NULL,
  `before_data` TEXT DEFAULT NULL,
  `after_data` TEXT DEFAULT NULL,
  `ip` VARCHAR(50) DEFAULT NULL,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `integrity_checks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `score_id` INT NOT NULL,
  `database_hash` VARCHAR(66) NOT NULL,
  `blockchain_hash` VARCHAR(66) DEFAULT NULL,
  `database_version` INT NOT NULL,
  `blockchain_version` INT DEFAULT NULL,
  `result` VARCHAR(20) NOT NULL,
  `details` TEXT NOT NULL,
  `checked_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_check_score_id` (`score_id`),
  CONSTRAINT `fk_checks_score` FOREIGN KEY (`score_id`) REFERENCES `scores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
