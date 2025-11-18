-- Migration: Add start_date and end_date fields to work_items table for story date tracking
-- This migration ensures the columns exist and are properly configured

-- Check if columns exist and add them if missing
ALTER TABLE work_items 
ADD COLUMN IF NOT EXISTS start_date timestamp NULL DEFAULT NULL COMMENT 'Start date for work item timeline',
ADD COLUMN IF NOT EXISTS end_date timestamp NULL DEFAULT NULL COMMENT 'End date for work item timeline';

-- Add indexes for date-based queries if they don't exist
CREATE INDEX IF NOT EXISTS idx_work_items_start_date ON work_items(start_date);
CREATE INDEX IF NOT EXISTS idx_work_items_end_date ON work_items(end_date);
CREATE INDEX IF NOT EXISTS idx_work_items_date_range ON work_items(start_date, end_date);

-- Update any existing STORY items to have reasonable default dates if needed
-- (This is optional - you may want to leave dates NULL for existing stories)
-- UPDATE work_items 
-- SET start_date = created_at, 
--     end_date = DATE_ADD(created_at, INTERVAL 7 DAY)
-- WHERE type = 'STORY' 
--   AND start_date IS NULL 
--   AND end_date IS NULL;