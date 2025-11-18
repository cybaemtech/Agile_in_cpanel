-- Fix work items with missing creator information
-- This script will update work items that have NULL or missing reporter_id

USE agile;

-- First, let's see what we're working with
SELECT 'Work items without reporter_id:' as info, COUNT(*) as count 
FROM work_items 
WHERE reporter_id IS NULL;

SELECT 'Total work items:' as info, COUNT(*) as count 
FROM work_items;

SELECT 'Active users:' as info, COUNT(*) as count 
FROM users 
WHERE is_active = 1;

-- Find first admin user to use as fallback
SELECT 'First admin user:' as info, id, username, email, full_name 
FROM users 
WHERE user_role = 'ADMIN' AND is_active = 1 
LIMIT 1;

-- Update work items without reporter_id to use the first admin user
UPDATE work_items 
SET reporter_id = (
    SELECT id 
    FROM users 
    WHERE user_role = 'ADMIN' AND is_active = 1 
    LIMIT 1
)
WHERE reporter_id IS NULL;

-- If no admin exists, use the first active user
UPDATE work_items 
SET reporter_id = (
    SELECT id 
    FROM users 
    WHERE is_active = 1 
    LIMIT 1
)
WHERE reporter_id IS NULL;

-- Show updated results
SELECT 'Work items after update:' as info, 
    COUNT(CASE WHEN reporter_id IS NULL THEN 1 END) as null_count,
    COUNT(*) as total_count
FROM work_items;

-- Show sample work items with creator info
SELECT 'Sample work items with creators:' as info;
SELECT 
    wi.id, 
    wi.title, 
    wi.reporter_id,
    u.username,
    u.email,
    u.full_name,
    wi.created_at
FROM work_items wi
LEFT JOIN users u ON wi.reporter_id = u.id
ORDER BY wi.created_at DESC
LIMIT 5;