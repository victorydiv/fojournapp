-- Add missing columns to existing account_merges table
-- This updates production to match what the application code expects

-- Add the status column (required by search functionality)
ALTER TABLE account_merges 
ADD COLUMN status ENUM('pending', 'accepted', 'rejected') DEFAULT 'accepted';

-- Add invitation tracking columns
ALTER TABLE account_merges 
ADD COLUMN invited_by INT NULL;

-- Add timestamp columns
ALTER TABLE account_merges 
ADD COLUMN invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE account_merges 
ADD COLUMN accepted_at TIMESTAMP NULL;

ALTER TABLE account_merges 
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE account_merges 
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Update the merge_slug column to match dev schema length
ALTER TABLE account_merges 
MODIFY COLUMN merge_slug VARCHAR(255) UNIQUE NOT NULL;

-- Add foreign key constraints
ALTER TABLE account_merges 
ADD CONSTRAINT fk_user1 
FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE account_merges 
ADD CONSTRAINT fk_user2 
FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE account_merges 
ADD CONSTRAINT fk_invited_by 
FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add unique constraints for user IDs
ALTER TABLE account_merges 
ADD CONSTRAINT unique_user1 UNIQUE (user1_id);

ALTER TABLE account_merges 
ADD CONSTRAINT unique_user2 UNIQUE (user2_id);

-- Update existing rows to have proper status
UPDATE account_merges 
SET status = 'accepted', 
    accepted_at = merged_at,
    created_at = COALESCE(merged_at, NOW()),
    updated_at = COALESCE(merged_at, NOW())
WHERE status IS NULL;

-- Verify the changes
SELECT 'Schema updated successfully' as status;
DESCRIBE account_merges;