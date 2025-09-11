-- Add travel information table for storing private user travel credentials
-- This information is private and only accessible to the user

USE travel_log;

-- Create the table without foreign key constraint first
CREATE TABLE IF NOT EXISTS user_travel_info (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  frequent_flyer_programs JSON,
  known_traveler_number VARCHAR(50),
  global_entry_number VARCHAR(50),
  passport_number VARCHAR(50),
  passport_expiry DATE,
  passport_country VARCHAR(3),
  tsa_precheck BOOLEAN DEFAULT FALSE,
  clear_membership BOOLEAN DEFAULT FALSE,
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  emergency_contact_relationship VARCHAR(50),
  medical_conditions TEXT,
  allergies TEXT,
  medications TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id)
);

-- Add foreign key constraint only if users table exists
SET @constraint_exists = (
  SELECT COUNT(*) 
  FROM information_schema.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = 'travel_log' 
  AND TABLE_NAME = 'user_travel_info' 
  AND CONSTRAINT_NAME = 'fk_user_travel_info_user_id'
);

SET @users_table_exists = (
  SELECT COUNT(*) 
  FROM information_schema.TABLES 
  WHERE TABLE_SCHEMA = 'travel_log' 
  AND TABLE_NAME = 'users'
);

-- Add foreign key constraint if users table exists and constraint doesn't already exist
SET @sql = IF(@users_table_exists > 0 AND @constraint_exists = 0,
  'ALTER TABLE user_travel_info ADD CONSTRAINT fk_user_travel_info_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
  'SELECT "Foreign key constraint not added - users table may not exist" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
