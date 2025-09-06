-- Fix foreign key constraint in user_template_library table
-- The original_template_id should reference templates.id, not checklists.id

USE victorydiv24_travel_log2;

-- First, check current constraints
SELECT 
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = 'victorydiv24_travel_log2' 
  AND TABLE_NAME = 'user_template_library' 
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Drop the incorrect foreign key constraint
-- (The constraint name might be different, check output above first)
SET @sql = (
    SELECT CONCAT('ALTER TABLE user_template_library DROP FOREIGN KEY ', CONSTRAINT_NAME)
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = 'victorydiv24_travel_log2' 
      AND TABLE_NAME = 'user_template_library' 
      AND COLUMN_NAME = 'original_template_id'
      AND REFERENCED_TABLE_NAME = 'checklists'
);

-- Execute the drop constraint command if it exists
SET @sql = IFNULL(@sql, 'SELECT "No constraint to drop" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add the correct foreign key constraint
ALTER TABLE user_template_library 
ADD CONSTRAINT user_template_library_ibfk_template 
FOREIGN KEY (original_template_id) REFERENCES templates(id) ON DELETE CASCADE;

-- Verify the fix
SELECT 
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = 'victorydiv24_travel_log2' 
  AND TABLE_NAME = 'user_template_library' 
  AND REFERENCED_TABLE_NAME IS NOT NULL;

SELECT 'Foreign key constraint fixed successfully!' as status;
