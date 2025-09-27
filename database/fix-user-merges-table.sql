-- Fix for production user_merges table issue
-- The auth.js code was looking for 'user_merges' table but production has 'account_merges'
-- This script ensures the correct table exists with proper structure

-- Create account_merges table if it doesn't exist (it should already exist from previous migrations)
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

-- Verify the table exists and show its structure
SELECT 'account_merges table exists' as message;
DESCRIBE account_merges;