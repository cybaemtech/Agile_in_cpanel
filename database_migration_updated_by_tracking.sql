-- Migration: Add updated_by field to track who last modified work items
-- This enables proper audit trail like Jira/GitHub

USE agile;

-- Add updated_by column to work_items table
ALTER TABLE work_items 
ADD COLUMN updated_by int(11) DEFAULT NULL COMMENT 'User who last updated this work item' AFTER reporter_id,
ADD INDEX idx_work_items_updated_by (updated_by),
ADD CONSTRAINT fk_work_items_updated_by 
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- Update existing records to set updated_by to reporter_id (creator) as default
UPDATE work_items 
SET updated_by = reporter_id 
WHERE updated_by IS NULL AND reporter_id IS NOT NULL;

-- For records without reporter_id, try to find the first admin user
UPDATE work_items 
SET updated_by = (SELECT id FROM users WHERE user_role = 'ADMIN' LIMIT 1)
WHERE updated_by IS NULL;