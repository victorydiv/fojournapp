-- Account Merging Database Schema Migration
-- Run this in your production database to add the merge functionality

-- Create account_merges table
CREATE TABLE IF NOT EXISTS account_merges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user1_id INT NOT NULL,
    user2_id INT NOT NULL,
    merge_slug VARCHAR(255) UNIQUE NOT NULL,
    merge_settings JSON,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    invited_by INT NOT NULL,
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user1 (user1_id),
    UNIQUE KEY unique_user2 (user2_id)
);

-- Create merge_invitations table
CREATE TABLE IF NOT EXISTS merge_invitations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_user_id INT NOT NULL,
    to_user_id INT NOT NULL,
    invitation_token VARCHAR(255) UNIQUE NOT NULL,
    status ENUM('pending', 'accepted', 'rejected', 'expired') DEFAULT 'pending',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
);

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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_account_merges_user1 ON account_merges(user1_id);
CREATE INDEX IF NOT EXISTS idx_account_merges_user2 ON account_merges(user2_id);
CREATE INDEX IF NOT EXISTS idx_account_merges_slug ON account_merges(merge_slug);
CREATE INDEX IF NOT EXISTS idx_merge_invitations_from_user ON merge_invitations(from_user_id);
CREATE INDEX IF NOT EXISTS idx_merge_invitations_to_user ON merge_invitations(to_user_id);
CREATE INDEX IF NOT EXISTS idx_merge_invitations_token ON merge_invitations(invitation_token);

-- Verify the tables were created
SELECT 'Tables created successfully' as status;
SHOW TABLES LIKE '%merge%';
DESCRIBE user_merge_info;