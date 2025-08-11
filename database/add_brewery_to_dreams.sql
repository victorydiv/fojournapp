-- Add 'brewery' to dream_type ENUM
ALTER TABLE dreams MODIFY COLUMN dream_type ENUM('destination', 'attraction', 'restaurant', 'accommodation', 'activity', 'brewery', 'other') DEFAULT 'destination';
