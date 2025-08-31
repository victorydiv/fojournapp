-- Migration to add state_count criteria type to badges table
-- Run this to update existing database

ALTER TABLE badges MODIFY COLUMN criteria_type 
ENUM('count', 'first_time', 'location', 'tag', 'completion', 'state_count') NOT NULL;
