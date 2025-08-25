-- Add avatar support to users table
-- Execute this in your MySQL client

ALTER TABLE users 
ADD COLUMN avatar_path VARCHAR(500) AFTER last_name,
ADD COLUMN avatar_filename VARCHAR(255) AFTER avatar_path;

-- Add index for avatar path for efficient queries
CREATE INDEX idx_avatar_path ON users(avatar_path);
