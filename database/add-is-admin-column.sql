-- Add is_admin column to users table
-- This column is required for blog admin functionality

USE victorydiv24_travel_log2;

-- Add is_admin column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE AFTER is_active;

-- Set your user as admin (replace with your actual user ID or email)
-- You can check your user ID with: SELECT id, username, email FROM users;
UPDATE users 
SET is_admin = TRUE 
WHERE email = 'your-email@example.com'; -- Replace with your actual email

-- Verify the change
SELECT id, username, email, is_admin 
FROM users 
WHERE is_admin = TRUE;

SELECT 'is_admin column added successfully!' as status;
