-- Account Merging Database Schema Migration
-- Run this in your production database to add the merge functionality

-- Add missing columns to users table first
ALTER TABLE users 
ADD COLUMN is_merged BOOLEAN DEFAULT FALSE,
ADD COLUMN merge_id INT NULL,
ADD COLUMN original_public_username VARCHAR(50) NULL;

-- Create account_merges table
CREATE TABLE IF NOT EXISTS account_merges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user1_id INT NOT NULL,
    user2_id INT NOT NULL,
    merge_slug VARCHAR(255) UNIQUE NOT NULL,
    merge_settings JSON,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'accepted',
    invited_by INT NULL,
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user1 (user1_id),
    UNIQUE KEY unique_user2 (user2_id)
);

-- Create account_merge_invitations table
CREATE TABLE IF NOT EXISTS account_merge_invitations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inviter_user_id INT NOT NULL,
    invited_user_id INT NOT NULL,
    invitation_message TEXT,
    status ENUM('pending', 'accepted', 'declined', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP NULL,
    expires_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL 7 DAY),
    FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_inviter (inviter_user_id),
    UNIQUE KEY unique_invitee (invited_user_id)
);

-- Create account_merge_history table (for the history endpoint)
CREATE TABLE IF NOT EXISTS account_merge_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user1_id INT NOT NULL,
    user2_id INT NOT NULL,
    action ENUM('merged', 'unmerged') NOT NULL,
    merge_slug VARCHAR(100),
    merge_duration INT,
    action_initiated_by INT NOT NULL,
    reason TEXT,
    action_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (action_initiated_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Create merge_url_redirects table for handling old individual URLs
CREATE TABLE IF NOT EXISTS merge_url_redirects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    original_username VARCHAR(50) NOT NULL,
    original_public_username VARCHAR(50),
    merge_slug VARCHAR(100) NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_original_username (original_username),
    UNIQUE KEY unique_original_public_username (original_public_username)
);

-- Create admin_settings table for configurable application settings
CREATE TABLE IF NOT EXISTS admin_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default admin settings
INSERT IGNORE INTO admin_settings (setting_key, setting_value, setting_type, description) VALUES
('merge_unmerge_cooling_period_days', '0', 'number', 'Number of days users must wait after merging before they can unmerge'),
('max_merge_invitations_per_user', '1', 'number', 'Maximum number of active merge invitations a user can have'),
('merge_invitation_expiry_days', '7', 'number', 'Number of days before merge invitations expire');

-- Create user_merge_info view
CREATE OR REPLACE VIEW user_merge_info AS
SELECT 
    u.id as user_id,
    u.username,
    u.email,
    CASE 
        WHEN am.id IS NOT NULL THEN TRUE 
        ELSE FALSE 
    END as is_merged,
    am.merge_slug,
    CASE 
        WHEN am.user1_id = u.id THEN u2.id
        WHEN am.user2_id = u.id THEN u1.id
        ELSE NULL
    END as partner_user_id,
    CASE 
        WHEN am.user1_id = u.id THEN u2.username
        WHEN am.user2_id = u.id THEN u1.username
        ELSE NULL
    END as partner_username,
    CASE 
        WHEN am.user1_id = u.id THEN u2.public_username
        WHEN am.user2_id = u.id THEN u1.public_username
        ELSE NULL
    END as partner_public_username,
    am.merge_settings
FROM users u
LEFT JOIN account_merges am ON (
    (am.user1_id = u.id OR am.user2_id = u.id) 
    AND am.status = 'accepted'
)
LEFT JOIN users u1 ON am.user1_id = u1.id
LEFT JOIN users u2 ON am.user2_id = u2.id;

-- Add foreign key constraint for users.merge_id after account_merges table exists
ALTER TABLE users 
ADD CONSTRAINT fk_user_merge 
FOREIGN KEY (merge_id) REFERENCES account_merges(id) ON DELETE SET NULL;

-- Verify the tables were created
SELECT 'Tables created successfully' as status;
SHOW TABLES LIKE '%merge%';
DESCRIBE user_merge_info;