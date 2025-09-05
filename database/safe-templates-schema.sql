-- Safe schema update that checks for existing constraints
USE travel_log;

-- Create templates table (independent from checklists)
CREATE TABLE IF NOT EXISTS templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  creator_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category ENUM('general', 'packing', 'planning', 'activities', 'documents', 'food', 'other') DEFAULT 'general',
  color VARCHAR(7) DEFAULT '#1976d2',
  usage_count INT DEFAULT 0,
  last_used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_category (category),
  INDEX idx_creator (creator_id),
  INDEX idx_usage (usage_count),
  INDEX idx_created (created_at)
);

-- Create template items table
CREATE TABLE IF NOT EXISTS template_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_id INT NOT NULL,
  text TEXT NOT NULL,
  order_index INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
  INDEX idx_template (template_id),
  INDEX idx_sort (order_index)
);

-- Check what constraints exist and drop them safely
SET @sql = NULL;
SELECT CONCAT('ALTER TABLE user_template_library DROP FOREIGN KEY ', CONSTRAINT_NAME, ';') INTO @sql
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'user_template_library'
AND TABLE_SCHEMA = DATABASE()
AND REFERENCED_TABLE_NAME IS NOT NULL
AND COLUMN_NAME = 'template_id'
LIMIT 1;

-- Execute the drop constraint if it exists
SET @sql = IFNULL(@sql, 'SELECT "No foreign key constraint found" as message;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add new template_id column for the new templates table if it doesn't exist
SET @sql = 'SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = "user_template_library" AND COLUMN_NAME = "template_id"';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add the column only if it doesn't exist
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE user_template_library ADD COLUMN template_id INT NULL;',
    'SELECT "Column template_id already exists" as message;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add new foreign key for templates table
ALTER TABLE user_template_library 
ADD CONSTRAINT fk_template_library_template 
FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE;

SELECT 'Schema update completed successfully' as status;
