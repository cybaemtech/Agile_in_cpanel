-- Migration: Add tags field to work_items table
-- Date: October 13, 2025
-- Description: Add tags column to support work item tagging functionality

USE `agile`;

-- Add tags column to work_items table
-- Using TEXT to store comma-separated tags for simplicity
-- Alternative: JSON column for MySQL 5.7+ or separate tags table for normalization
ALTER TABLE `work_items` 
ADD COLUMN `tags` TEXT DEFAULT NULL 
COMMENT 'Comma-separated tags for categorization (e.g., "WebApp,Integration,Backend API")' 
AFTER `description`;

-- Add index for tags column to improve search performance
ALTER TABLE `work_items` 
ADD FULLTEXT INDEX `idx_work_items_tags` (`tags`);

-- Update some existing work items with sample tags
UPDATE `work_items` SET `tags` = 'WebApp,Integration' WHERE `external_id` = 'PROJ-2';
UPDATE `work_items` SET `tags` = 'Backend API,Data Integrity' WHERE `external_id` = 'PROJ-1';
UPDATE `work_items` SET `tags` = 'Mobile,Notification' WHERE `external_id` = 'PROJ-3';
UPDATE `work_items` SET `tags` = 'WebApp,Frontend' WHERE `external_id` = 'PROJ-4';
UPDATE `work_items` SET `tags` = 'E-commerce,Catalog' WHERE `external_id` = 'ECOM-1';
UPDATE `work_items` SET `tags` = 'E-commerce,Shopping' WHERE `external_id` = 'ECOM-2';

COMMIT;