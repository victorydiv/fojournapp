-- Fix account_merges table schema mismatch
-- This adds the missing columns that the application code expects

-- Add the status column that the search functionality requires
ALTER TABLE account_merges 
ADD COLUMN status ENUM('pending', 'accepted', 'rejected') DEFAULT 'accepted';

-- Update existing rows to have 'accepted' status since they're already merged
UPDATE account_merges SET status = 'accepted' WHERE status IS NULL;

-- Optionally add other columns from the dev schema
ALTER TABLE account_merges 
ADD COLUMN invited_by INT NULL,
ADD COLUMN invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN accepted_at TIMESTAMP NULL,
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add foreign key for invited_by if you want it
-- ALTER TABLE account_merges 
-- ADD CONSTRAINT fk_invited_by 
-- FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL;

-- Update merge_slug to match dev schema length
ALTER TABLE account_merges 
MODIFY COLUMN merge_slug VARCHAR(255) UNIQUE NOT NULL;

-- Verify the changes
DESCRIBE account_merges;