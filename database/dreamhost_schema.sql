-- DreamHost Travel Log Database Schema
-- This schema is adapted for DreamHost shared hosting
-- Database: victorydiv24_travel_log2

USE victorydiv24_travel_log2;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  profile_picture VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Travel entries table
CREATE TABLE IF NOT EXISTS travel_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location_name VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  visit_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Media files table
CREATE TABLE IF NOT EXISTS media_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entry_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_type ENUM('image', 'video', 'audio', 'document') NOT NULL,
  mime_type VARCHAR(100),
  file_size INT,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entry_id) REFERENCES travel_entries(id) ON DELETE CASCADE
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Entry tags junction table
CREATE TABLE IF NOT EXISTS entry_tags (
  entry_id INT,
  tag_id INT,
  PRIMARY KEY (entry_id, tag_id),
  FOREIGN KEY (entry_id) REFERENCES travel_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE NOT NULL,
  privacy_level ENUM('public', 'friends', 'private') DEFAULT 'private',
  email_notifications BOOLEAN DEFAULT TRUE,
  theme ENUM('light', 'dark') DEFAULT 'light',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Shared entries table (for sharing functionality)
CREATE TABLE IF NOT EXISTS shared_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entry_id INT NOT NULL,
  shared_by INT NOT NULL,
  shared_with INT,
  share_token VARCHAR(255) UNIQUE,
  share_type ENUM('private', 'public', 'token') DEFAULT 'private',
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entry_id) REFERENCES travel_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_with) REFERENCES users(id) ON DELETE CASCADE
);

-- Dreams table (for travel dreams/wishlist)
CREATE TABLE IF NOT EXISTS dreams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location_name VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  dream_type ENUM('destination', 'activity', 'experience', 'accommodation', 'restaurant', 'brewery') DEFAULT 'destination',
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  target_date DATE,
  estimated_cost DECIMAL(10, 2),
  notes TEXT,
  achieved BOOLEAN DEFAULT FALSE,
  achieved_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Journey collaboration table
CREATE TABLE IF NOT EXISTS journey_collaborations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  journey_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('owner', 'editor', 'viewer') DEFAULT 'viewer',
  invited_by INT NOT NULL,
  status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
  permissions JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_journey_user (journey_id, user_id),
  FOREIGN KEY (journey_id) REFERENCES travel_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_travel_entries_user_id ON travel_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_travel_entries_location ON travel_entries(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_travel_entries_visit_date ON travel_entries(visit_date);
CREATE INDEX IF NOT EXISTS idx_media_files_entry_id ON media_files(entry_id);
CREATE INDEX IF NOT EXISTS idx_dreams_user_id ON dreams(user_id);
CREATE INDEX IF NOT EXISTS idx_dreams_achieved ON dreams(achieved);
CREATE INDEX IF NOT EXISTS idx_shared_entries_token ON shared_entries(share_token);
CREATE INDEX IF NOT EXISTS idx_journey_collaborations_journey_id ON journey_collaborations(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_collaborations_user_id ON journey_collaborations(user_id);

-- Insert some default tags
INSERT IGNORE INTO tags (name) VALUES 
('adventure'), ('family'), ('solo'), ('business'), ('vacation'), 
('food', 'culture'), ('nature'), ('urban'), ('beach'), ('mountain');

-- Create a sample admin user (password: admin123 - change this!)
-- Password hash for 'admin123' using bcrypt
INSERT IGNORE INTO users (username, email, password_hash, first_name, last_name) VALUES 
('admin', 'admin@fojourn.site', '$2b$10$rHQP8LqNvUqfqCxqvwTGeeNiPKQfOuFr4oQNJ5N5N5N5N5N5N5N5N', 'Site', 'Administrator');

-- Create user preferences for admin
INSERT IGNORE INTO user_preferences (user_id, privacy_level, email_notifications) 
SELECT id, 'private', TRUE FROM users WHERE username = 'admin';

SELECT 'DreamHost Travel Log database schema setup complete!' as message;
