-- Account Merging Database Schema
-- This schema supports two users merging their accounts to share private content
-- while maintaining individual data ownership and allowing for unmerging

-- Account merge requests table
CREATE TABLE IF NOT EXISTS account_merge_invitations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inviter_user_id INT NOT NULL,
  invited_user_id INT NOT NULL,
  status ENUM('pending', 'accepted', 'declined', 'cancelled') DEFAULT 'pending',
  invitation_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL,
  expires_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL 7 DAY),
  
  FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Only one active invitation per user (as inviter OR invitee)
  UNIQUE KEY unique_inviter (inviter_user_id),
  UNIQUE KEY unique_invitee (invited_user_id),
  
  INDEX idx_status (status),
  INDEX idx_expires (expires_at)
);

-- Account merges table (active merged relationships)
CREATE TABLE IF NOT EXISTS account_merges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user1_id INT NOT NULL,
  user2_id INT NOT NULL,
  merge_slug VARCHAR(100) UNIQUE NOT NULL, -- Unique URL for merged profile (e.g., "john-jane-travels")
  merged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  merge_settings JSON, -- Store preferences like display order, visibility rules
  
  FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user1 (user1_id),
  INDEX idx_user2 (user2_id),
  INDEX idx_merge_slug (merge_slug),
  
  -- Ensure no user is in multiple merges
  CONSTRAINT unique_user1 UNIQUE (user1_id),
  CONSTRAINT unique_user2 UNIQUE (user2_id)
);

-- Merge history table (for tracking unmerges and re-merges)
CREATE TABLE IF NOT EXISTS account_merge_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user1_id INT NOT NULL,
  user2_id INT NOT NULL,
  action ENUM('merged', 'unmerged') NOT NULL,
  merge_slug VARCHAR(100),
  merge_duration INT, -- How long they were merged (in days)
  action_initiated_by INT NOT NULL, -- Which user initiated the action
  reason TEXT, -- Optional reason for merge/unmerge
  action_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (action_initiated_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_users (user1_id, user2_id),
  INDEX idx_action (action),
  INDEX idx_action_date (action_at)
);

-- Add fields to users table for merge functionality
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS merge_id INT NULL,
ADD COLUMN IF NOT EXISTS original_public_username VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS is_merged BOOLEAN DEFAULT FALSE,
ADD CONSTRAINT fk_user_merge FOREIGN KEY (merge_id) REFERENCES account_merges(id) ON DELETE SET NULL;

-- Create index on merge_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_merge_id ON users(merge_id);
CREATE INDEX IF NOT EXISTS idx_user_is_merged ON users(is_merged);

-- View for easy merge lookup
CREATE OR REPLACE VIEW user_merge_info AS
SELECT 
  u.id as user_id,
  u.username,
  u.public_username,
  u.first_name,
  u.last_name,
  u.is_merged,
  am.id as merge_id,
  am.merge_slug,
  am.merged_at,
  CASE 
    WHEN u.id = am.user1_id THEN am.user2_id
    WHEN u.id = am.user2_id THEN am.user1_id
    ELSE NULL
  END as partner_user_id,
  CASE 
    WHEN u.id = am.user1_id THEN u2.username
    WHEN u.id = am.user2_id THEN u1.username
    ELSE NULL
  END as partner_username,
  CASE 
    WHEN u.id = am.user1_id THEN CONCAT(u2.first_name, ' ', u2.last_name)
    WHEN u.id = am.user2_id THEN CONCAT(u1.first_name, ' ', u1.last_name)
    ELSE NULL
  END as partner_full_name,
  CASE 
    WHEN u.id = am.user1_id THEN u2.public_username
    WHEN u.id = am.user2_id THEN u1.public_username
    ELSE NULL
  END as partner_public_username
FROM users u
LEFT JOIN account_merges am ON u.merge_id = am.id
LEFT JOIN users u1 ON am.user1_id = u1.id
LEFT JOIN users u2 ON am.user2_id = u2.id;

-- Create merge URL redirect table for handling old individual URLs
CREATE TABLE IF NOT EXISTS merge_url_redirects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  original_username VARCHAR(50) NOT NULL,
  original_public_username VARCHAR(50),
  merge_slug VARCHAR(100) NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_original_username (original_username),
  UNIQUE KEY unique_original_public_username (original_public_username),
  INDEX idx_merge_slug (merge_slug)
);

-- Admin settings table for configurable application settings
CREATE TABLE IF NOT EXISTS admin_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_setting_key (setting_key)
);

-- Insert default admin settings
INSERT IGNORE INTO admin_settings (setting_key, setting_value, setting_type, description) VALUES
('merge_unmerge_cooling_period_days', '0', 'number', 'Number of days users must wait after merging before they can unmerge'),
('max_merge_invitations_per_user', '1', 'number', 'Maximum number of active merge invitations a user can have'),
('merge_invitation_expiry_days', '7', 'number', 'Number of days before merge invitations expire');

-- Sample merge settings JSON structure:
-- {
--   "display_order": "chronological|user1_first|user2_first",
--   "profile_display": {
--     "show_both_names": true,
--     "bio_merge_strategy": "combine|primary_only",
--     "avatar_display": "both|primary|alternate"
--   },
--   "privacy": {
--     "cross_user_visibility": true,
--     "shared_statistics": true
--   },
--   "content_settings": {
--     "merge_timelines": true,
--     "separate_authorship": true
--   }
-- }