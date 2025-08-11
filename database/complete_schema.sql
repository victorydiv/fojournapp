-- Complete Travel Log Database Schema
-- Run this script in Railway MySQL to create all required tables

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create journeys table (this is what's missing!)
CREATE TABLE IF NOT EXISTS journeys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  owner_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  destination VARCHAR(255),
  start_destination VARCHAR(255),
  end_destination VARCHAR(255),
  start_date DATE,
  end_date DATE,
  status ENUM('planning', 'active', 'completed', 'cancelled') DEFAULT 'planning',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_journey (user_id),
  INDEX idx_owner_journey (owner_id),
  INDEX idx_dates (start_date, end_date)
);

-- Create journey_collaborators table
CREATE TABLE IF NOT EXISTS journey_collaborators (
  id INT AUTO_INCREMENT PRIMARY KEY,
  journey_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('viewer', 'editor', 'admin') DEFAULT 'viewer',
  status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
  invited_by INT NOT NULL,
  invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL,
  FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_journey_user (journey_id, user_id),
  INDEX idx_user_collaborations (user_id),
  INDEX idx_journey_collaborators (journey_id)
);

-- Create travel_entries table
CREATE TABLE IF NOT EXISTS travel_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  journey_id INT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  location_name VARCHAR(255),
  entry_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE SET NULL,
  INDEX idx_user_date (user_id, entry_date),
  INDEX idx_journey_entries (journey_id),
  INDEX idx_location (latitude, longitude)
);

-- Create experiences table
CREATE TABLE IF NOT EXISTS experiences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  journey_id INT NOT NULL,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_name VARCHAR(255),
  experience_date DATE,
  experience_time TIME,
  memory_type ENUM('activity', 'meal', 'accommodation', 'transportation', 'attraction', 'other') DEFAULT 'other',
  rating INT CHECK (rating >= 1 AND rating <= 5),
  cost DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_journey_experiences (journey_id),
  INDEX idx_user_experiences (user_id),
  INDEX idx_experience_date (experience_date),
  INDEX idx_location_exp (latitude, longitude)
);

-- Create media_files table
CREATE TABLE IF NOT EXISTS media_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entry_id INT NULL,
  experience_id INT NULL,
  journey_id INT NULL,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  thumbnail_path VARCHAR(500) NULL,
  file_type ENUM('image', 'video', 'document') NOT NULL,
  file_size INT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entry_id) REFERENCES travel_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (experience_id) REFERENCES experiences(id) ON DELETE CASCADE,
  FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE,
  INDEX idx_entry_media (entry_id),
  INDEX idx_experience_media (experience_id),
  INDEX idx_journey_media (journey_id)
);

-- Create activity_links table
CREATE TABLE IF NOT EXISTS activity_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entry_id INT NULL,
  experience_id INT NULL,
  journey_id INT NULL,
  title VARCHAR(200) NOT NULL,
  url VARCHAR(500) NOT NULL,
  description TEXT,
  link_type ENUM('activity', 'attraction', 'restaurant', 'accommodation', 'other') DEFAULT 'other',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entry_id) REFERENCES travel_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (experience_id) REFERENCES experiences(id) ON DELETE CASCADE,
  FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE
);

-- Create entry_tags table for search functionality
CREATE TABLE IF NOT EXISTS entry_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entry_id INT NULL,
  experience_id INT NULL,
  journey_id INT NULL,
  tag VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entry_id) REFERENCES travel_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (experience_id) REFERENCES experiences(id) ON DELETE CASCADE,
  FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE,
  INDEX idx_tag (tag),
  INDEX idx_entry_tags (entry_id),
  INDEX idx_experience_tags (experience_id),
  INDEX idx_journey_tags (journey_id)
);

-- Show all created tables
SHOW TABLES;
