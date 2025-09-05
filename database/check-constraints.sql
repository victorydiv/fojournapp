-- Check existing foreign key constraints first
SHOW CREATE TABLE user_template_library;

-- Or check constraints with:
SELECT 
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'user_template_library'
AND TABLE_SCHEMA = 'travel_log'
AND REFERENCED_TABLE_NAME IS NOT NULL;
