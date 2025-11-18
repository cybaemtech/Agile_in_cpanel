-- Email Verification System Migration
-- Add email verification fields to users table

USE agile;

-- Add new columns for email verification
ALTER TABLE `users` 
ADD COLUMN `email_verified` BOOLEAN DEFAULT FALSE AFTER `is_active`,
ADD COLUMN `email_verification_token` VARCHAR(255) NULL AFTER `email_verified`,
ADD COLUMN `email_verification_token_expires` TIMESTAMP NULL AFTER `email_verification_token`,
ADD COLUMN `otp_code` VARCHAR(6) NULL AFTER `email_verification_token_expires`,
ADD COLUMN `otp_expires` TIMESTAMP NULL AFTER `otp_code`,
ADD COLUMN `otp_attempts` INT DEFAULT 0 AFTER `otp_expires`,
ADD COLUMN `last_otp_sent` TIMESTAMP NULL AFTER `otp_attempts`;

-- Update existing users to be verified (for backward compatibility)
UPDATE `users` SET `email_verified` = TRUE WHERE `email_verified` IS NULL OR `email_verified` = FALSE;

-- Create index for better performance
CREATE INDEX idx_users_email_verification ON users(email_verification_token);
CREATE INDEX idx_users_otp ON users(otp_code, otp_expires);

-- Add password reset token fields if they don't exist
ALTER TABLE `users` 
ADD COLUMN IF NOT EXISTS `reset_token` VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS `reset_token_expiry` TIMESTAMP NULL;