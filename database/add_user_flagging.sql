-- Add user flagging support for content moderation
-- Execute this in your MySQL client

-- Add flagging fields to users table
ALTER TABLE users 
ADD COLUMN is_flagged BOOLEAN DEFAULT FALSE AFTER is_admin,
ADD COLUMN flag_reason VARCHAR(500) AFTER is_flagged,
ADD COLUMN flagged_at TIMESTAMP NULL AFTER flag_reason,
ADD COLUMN flagged_by INT NULL AFTER flagged_at;

-- Add index for flagged users
CREATE INDEX idx_flagged_users ON users(is_flagged);

-- Add foreign key for flagged_by admin user
ALTER TABLE users
ADD CONSTRAINT fk_flagged_by FOREIGN KEY (flagged_by) REFERENCES users(id) ON DELETE SET NULL;
