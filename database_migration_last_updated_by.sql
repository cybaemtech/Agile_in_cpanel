-- Migration: Add last_updated_by field to work_items table
-- This replaces the updated_by field with last_updated_by for better clarity

USE agile;

-- Check if updated_by exists and rename it to last_updated_by
SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'agile' 
    AND TABLE_NAME = 'work_items' 
    AND COLUMN_NAME = 'updated_by');

SET @last_updated_by_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'agile' 
    AND TABLE_NAME = 'work_items' 
    AND COLUMN_NAME = 'last_updated_by');

-- If updated_by exists but last_updated_by doesn't, rename the column
SET @sql = CASE 
    WHEN @column_exists = 1 AND @last_updated_by_exists = 0 THEN 
        'ALTER TABLE work_items CHANGE updated_by last_updated_by int(11) DEFAULT NULL COMMENT "User who last updated this work item";'
    WHEN @column_exists = 0 AND @last_updated_by_exists = 0 THEN
        'ALTER TABLE work_items ADD COLUMN last_updated_by int(11) DEFAULT NULL COMMENT "User who last updated this work item" AFTER reporter_id;'
    ELSE 
        'SELECT "Column last_updated_by already exists or no action needed" as message;'
END;

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index and foreign key if last_updated_by was just created
SET @add_constraints = CASE 
    WHEN @last_updated_by_exists = 0 THEN 
        CONCAT(
            'ALTER TABLE work_items ',
            'ADD INDEX idx_work_items_last_updated_by (last_updated_by), ',
            'ADD CONSTRAINT fk_work_items_last_updated_by ',
            'FOREIGN KEY (last_updated_by) REFERENCES users(id) ON DELETE SET NULL;'
        )
    ELSE 
        'SELECT "Constraints already exist or no action needed" as message;'
END;

PREPARE stmt2 FROM @add_constraints;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Update existing records to set last_updated_by to reporter_id (creator) as default
UPDATE work_items 
SET last_updated_by = reporter_id 
WHERE last_updated_by IS NULL AND reporter_id IS NOT NULL;

-- For records without reporter_id, try to find the first admin user
UPDATE work_items 
SET last_updated_by = (SELECT id FROM users WHERE user_role = 'ADMIN' LIMIT 1)
WHERE last_updated_by IS NULL;

SELECT "Migration completed successfully" as status;