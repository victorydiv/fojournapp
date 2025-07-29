-- Add brewery type to memory_type and experience type enums
-- This migration adds 'brewery' as a new option to the existing type enums

USE travel_log;

-- Update travel_entries table to add brewery to memory_type enum
ALTER TABLE travel_entries 
MODIFY COLUMN memory_type ENUM('attraction', 'restaurant', 'accommodation', 'activity', 'brewery', 'other') DEFAULT 'other';

-- Update journey_experiences table to add brewery to type enum
ALTER TABLE journey_experiences 
MODIFY COLUMN type ENUM('attraction', 'restaurant', 'accommodation', 'activity', 'brewery', 'other') NOT NULL;

-- Show the updated table structures
DESCRIBE travel_entries;
DESCRIBE journey_experiences;
