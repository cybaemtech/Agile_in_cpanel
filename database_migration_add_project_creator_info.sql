-- Migration to add createdByName and createdByEmail columns to projects table
-- This will store the creator's name and email at the time of project creation

ALTER TABLE `projects` 
ADD COLUMN `createdByName` VARCHAR(255) NULL AFTER `created_by`,
ADD COLUMN `createdByEmail` VARCHAR(255) NULL AFTER `createdByName`;

-- Optional: Update existing projects with creator info from users table
UPDATE `projects` p 
JOIN `users` u ON p.created_by = u.id 
SET 
    p.createdByName = COALESCE(u.full_name, u.username, 'Unknown User'),
    p.createdByEmail = COALESCE(u.email, 'unknown@example.com')
WHERE p.createdByName IS NULL OR p.createdByEmail IS NULL;