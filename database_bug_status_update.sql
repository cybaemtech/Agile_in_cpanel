-- Option 1: Modify existing status column to have simpler resolved/not-resolved values
-- This will change the existing status enum to have only resolved and not-resolved options

-- First, update existing data to map to new values
UPDATE project_bug_reports 
SET status = 'RESOLVED' 
WHERE status IN ('RESOLVED', 'CLOSED');

UPDATE project_bug_reports 
SET status = 'OPEN' 
WHERE status IN ('OPEN', 'IN_PROGRESS');

-- Then modify the column to use new enum values
ALTER TABLE project_bug_reports 
MODIFY COLUMN status ENUM('resolved', 'not-resolved') DEFAULT 'not-resolved';

-- Update data to use new enum values
UPDATE project_bug_reports 
SET status = 'resolved' 
WHERE status = 'RESOLVED';

UPDATE project_bug_reports 
SET status = 'not-resolved' 
WHERE status = 'OPEN';