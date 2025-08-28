-- Email Preferences Migration
-- Add email opt-out functionality to users table

-- Add email preference columns to users table
ALTER TABLE users 
ADD COLUMN email_notifications BOOLEAN DEFAULT TRUE COMMENT 'User wants to receive email notifications',
ADD COLUMN email_marketing BOOLEAN DEFAULT TRUE COMMENT 'User wants to receive marketing emails', 
ADD COLUMN email_announcements BOOLEAN DEFAULT TRUE COMMENT 'User wants to receive announcement emails',
ADD COLUMN unsubscribe_token VARCHAR(255) UNIQUE COMMENT 'Token for unsubscribe links',
ADD COLUMN email_preferences_updated_at TIMESTAMP NULL COMMENT 'When email preferences were last updated';

-- Create index for unsubscribe token lookups
CREATE INDEX idx_unsubscribe_token ON users(unsubscribe_token);

-- Generate unique unsubscribe tokens for existing users
UPDATE users 
SET unsubscribe_token = CONCAT(
  SUBSTRING(MD5(CONCAT(id, email, UNIX_TIMESTAMP())), 1, 16),
  '-',
  SUBSTRING(MD5(CONCAT(email, id, 'salt')), 1, 16)
)
WHERE unsubscribe_token IS NULL;
