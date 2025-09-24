-- Create memory_types table for dynamic categories
-- This replaces the hardcoded memory types with database-driven categories

CREATE TABLE IF NOT EXISTS memory_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7), -- For hex color codes like #1976d2
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active_sort (is_active, sort_order),
    INDEX idx_name (name)
);

-- Insert the existing hardcoded memory types as initial data (ignore if already exists)
INSERT IGNORE INTO memory_types (name, display_name, description, icon, color, sort_order) VALUES
('attraction', 'Attraction', 'Museums, landmarks, tourist sights and points of interest', '🏛️', '#1976d2', 1),
('restaurant', 'Restaurant', 'Dining experiences, cafes, bars and food establishments', '🍽️', '#f57c00', 2),
('accommodation', 'Accommodation', 'Hotels, hostels, camping, B&Bs and places to stay', '🏨', '#388e3c', 3),
('activity', 'Activity', 'Tours, sports, entertainment and recreational activities', '🎯', '#7b1fa2', 4),
('brewery', 'Brewery', 'Breweries, wineries, distilleries and craft beverage locations', '🍺', '#d32f2f', 5),
('other', 'Other', 'Miscellaneous experiences that don\'t fit other categories', '📍', '#616161', 6);

-- Convert memory_type column from ENUM to VARCHAR to match memory_types.name
-- First, let's see what memory_type values exist in travel_entries
-- SELECT DISTINCT memory_type FROM travel_entries;

-- Update any NULL values to 'other' before conversion
UPDATE travel_entries 
SET memory_type = 'other' 
WHERE memory_type IS NULL;

-- Convert the ENUM column to VARCHAR(50) to match memory_types.name
ALTER TABLE travel_entries 
MODIFY COLUMN memory_type VARCHAR(50) NOT NULL DEFAULT 'other';

-- Now we can safely add the foreign key constraint (if it doesn't already exist)
-- Check if the constraint already exists before adding it
SET @constraint_exists = (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'travel_entries'
    AND CONSTRAINT_NAME = 'fk_memory_type'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

-- Only add the constraint if it doesn't exist
SET @sql = IF(@constraint_exists = 0, 
    'ALTER TABLE travel_entries ADD CONSTRAINT fk_memory_type FOREIGN KEY (memory_type) REFERENCES memory_types(name) ON UPDATE CASCADE ON DELETE RESTRICT',
    'SELECT "Foreign key constraint already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify the setup
SELECT * FROM memory_types ORDER BY sort_order;