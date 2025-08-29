-- Add email_type column to sent_emails table for email preference tracking
ALTER TABLE sent_emails 
ADD COLUMN email_type ENUM('notifications', 'marketing', 'announcements') NULL 
COMMENT 'Type of email for preference filtering';

-- Add index for email type filtering
CREATE INDEX idx_email_type ON sent_emails(email_type);
