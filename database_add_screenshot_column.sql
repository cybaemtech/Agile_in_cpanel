-- Add screenshot_path column to project_bug_reports table
-- This allows users to upload screenshots with their bug reports

-- Add new screenshot_path column
ALTER TABLE project_bug_reports 
ADD COLUMN screenshot_path VARCHAR(500) NULL 
AFTER resolution_status;

-- Add index for better performance when querying screenshots
CREATE INDEX idx_screenshot_path ON project_bug_reports(screenshot_path);