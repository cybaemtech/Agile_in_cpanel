-- =====================================================
-- Email Verification System Migration Script
-- Run this script directly in phpMyAdmin or MySQL CLI
-- =====================================================

USE cybaemtechin_agile;

-- Check if columns exist before adding them
SET @exist := (SELECT count(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'cybaemtechin_agile' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email_verified');
SET @sqlstmt := IF(@exist > 0, 'SELECT "Column email_verified already exists"', 'ALTER TABLE `users` ADD COLUMN `email_verified` BOOLEAN DEFAULT FALSE AFTER `is_active`');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT count(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'cybaemtechin_agile' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email_verification_token');
SET @sqlstmt := IF(@exist > 0, 'SELECT "Column email_verification_token already exists"', 'ALTER TABLE `users` ADD COLUMN `email_verification_token` VARCHAR(255) NULL AFTER `email_verified`');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT count(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'cybaemtechin_agile' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email_verification_token_expires');
SET @sqlstmt := IF(@exist > 0, 'SELECT "Column email_verification_token_expires already exists"', 'ALTER TABLE `users` ADD COLUMN `email_verification_token_expires` TIMESTAMP NULL AFTER `email_verification_token`');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT count(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'cybaemtechin_agile' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'otp_code');
SET @sqlstmt := IF(@exist > 0, 'SELECT "Column otp_code already exists"', 'ALTER TABLE `users` ADD COLUMN `otp_code` VARCHAR(6) NULL AFTER `email_verification_token_expires`');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT count(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'cybaemtechin_agile' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'otp_expires');
SET @sqlstmt := IF(@exist > 0, 'SELECT "Column otp_expires already exists"', 'ALTER TABLE `users` ADD COLUMN `otp_expires` TIMESTAMP NULL AFTER `otp_code`');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT count(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'cybaemtechin_agile' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'otp_attempts');
SET @sqlstmt := IF(@exist > 0, 'SELECT "Column otp_attempts already exists"', 'ALTER TABLE `users` ADD COLUMN `otp_attempts` INT DEFAULT 0 AFTER `otp_expires`');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT count(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'cybaemtechin_agile' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'last_otp_sent');
SET @sqlstmt := IF(@exist > 0, 'SELECT "Column last_otp_sent already exists"', 'ALTER TABLE `users` ADD COLUMN `last_otp_sent` TIMESTAMP NULL AFTER `otp_attempts`');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add password reset columns if they don't exist
SET @exist := (SELECT count(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'cybaemtechin_agile' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'reset_token');
SET @sqlstmt := IF(@exist > 0, 'SELECT "Column reset_token already exists"', 'ALTER TABLE `users` ADD COLUMN `reset_token` VARCHAR(255) NULL AFTER `last_otp_sent`');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT count(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'cybaemtechin_agile' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'reset_token_expiry');
SET @sqlstmt := IF(@exist > 0, 'SELECT "Column reset_token_expiry already exists"', 'ALTER TABLE `users` ADD COLUMN `reset_token_expiry` TIMESTAMP NULL AFTER `reset_token`');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing users to be verified (for backward compatibility)
UPDATE `users` SET `email_verified` = TRUE WHERE `email_verified` IS NULL OR `email_verified` = FALSE;

-- Create indexes for better performance if they don't exist
SET @exist := (SELECT count(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = 'cybaemtechin_agile' AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_email_verification');
SET @sqlstmt := IF(@exist > 0, 'SELECT "Index idx_users_email_verification already exists"', 'CREATE INDEX idx_users_email_verification ON users(email_verification_token)');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT count(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = 'cybaemtechin_agile' AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_otp');
SET @sqlstmt := IF(@exist > 0, 'SELECT "Index idx_users_otp already exists"', 'CREATE INDEX idx_users_otp ON users(otp_code, otp_expires)');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Display the updated table structure
SELECT 'Migration completed successfully. Here is the updated users table structure:' AS message;
DESCRIBE users;