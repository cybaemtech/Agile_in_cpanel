-- Option 2: Add a new resolution_status column alongside existing status
-- This keeps the existing status column and adds a new one for resolution tracking

-- Add new resolution_status column
ALTER TABLE project_bug_reports 
ADD COLUMN resolution_status ENUM('resolved', 'not-resolved') DEFAULT 'not-resolved' 
AFTER status;

-- Update existing records based on current status
UPDATE project_bug_reports 
SET resolution_status = 'resolved' 
WHERE status IN ('RESOLVED', 'CLOSED');

UPDATE project_bug_reports 
SET resolution_status = 'not-resolved' 
WHERE status IN ('OPEN', 'IN_PROGRESS');