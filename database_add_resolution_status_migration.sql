-- Add resolution_status column to project_bug_reports table
-- This adds a new column to track whether bugs are resolved or not-resolved

-- Add new resolution_status column
ALTER TABLE project_bug_reports 
ADD COLUMN resolution_status ENUM('resolved', 'not-resolved') DEFAULT 'not-resolved' 
AFTER status;

-- Update existing records based on current status
-- Map RESOLVED and CLOSED to 'resolved'
UPDATE project_bug_reports 
SET resolution_status = 'resolved' 
WHERE status IN ('RESOLVED', 'CLOSED');

-- Map OPEN and IN_PROGRESS to 'not-resolved'
UPDATE project_bug_reports 
SET resolution_status = 'not-resolved' 
WHERE status IN ('OPEN', 'IN_PROGRESS');