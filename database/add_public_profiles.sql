-- Add public profile support to users and travel entries
-- Execute this in your MySQL client

-- Add public profile fields to users table (username already exists)
ALTER TABLE users 
ADD COLUMN profile_bio TEXT AFTER username,
ADD COLUMN profile_public BOOLEAN DEFAULT FALSE AFTER profile_bio;

-- Add public sharing fields to travel entries
ALTER TABLE travel_entries 
ADD COLUMN is_public BOOLEAN DEFAULT FALSE AFTER is_dog_friendly,
ADD COLUMN public_slug VARCHAR(100) UNIQUE AFTER is_public,
ADD COLUMN featured BOOLEAN DEFAULT FALSE AFTER public_slug;

-- Add indexes for efficient queries (skip username index as it already exists)
CREATE INDEX idx_public_entries ON travel_entries(is_public, featured);
CREATE INDEX idx_public_slug ON travel_entries(public_slug);
CREATE INDEX idx_user_public_entries ON travel_entries(user_id, is_public);
