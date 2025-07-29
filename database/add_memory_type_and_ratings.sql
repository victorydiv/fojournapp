-- Add memory type and rating fields to travel_entries table
USE travel_log;

-- Add memory_type column with values consistent with experience types
ALTER TABLE travel_entries 
ADD COLUMN memory_type ENUM('attraction', 'restaurant', 'accommodation', 'activity', 'other') DEFAULT 'other' AFTER location_name;

-- Add rating fields for restaurants
ALTER TABLE travel_entries 
ADD COLUMN restaurant_rating ENUM('happy', 'sad', 'neutral') NULL AFTER memory_type,
ADD COLUMN is_dog_friendly BOOLEAN DEFAULT FALSE AFTER restaurant_rating;

-- Add index for memory_type for better query performance
ALTER TABLE travel_entries 
ADD INDEX idx_memory_type (memory_type);

-- Show the updated table structure
DESCRIBE travel_entries;
