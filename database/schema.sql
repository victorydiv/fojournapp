-- Travel Log Database Schema
-- Run this script to create the database and tables

CREATE DATABASE IF NOT EXISTS travel_log;
USE travel_log;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  INDEX idx_username (username),
  INDEX idx_email (email)
);

-- Travel entries table
CREATE TABLE IF NOT EXISTS travel_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  location_name VARCHAR(255),
  entry_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_date (user_id, entry_date),
  INDEX idx_location (latitude, longitude),
  INDEX idx_user_id (user_id)
);

-- Media files table
CREATE TABLE IF NOT EXISTS media_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entry_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type ENUM('image', 'video', 'document') NOT NULL,
  file_size INT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entry_id) REFERENCES travel_entries(id) ON DELETE CASCADE,
  INDEX idx_entry_id (entry_id)
);

-- Activity links table
CREATE TABLE IF NOT EXISTS activity_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entry_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  url VARCHAR(500) NOT NULL,
  description TEXT,
  link_type ENUM('activity', 'attraction', 'restaurant', 'accommodation', 'other') DEFAULT 'other',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entry_id) REFERENCES travel_entries(id) ON DELETE CASCADE,
  INDEX idx_entry_id (entry_id)
);

-- Entry tags table for search functionality
CREATE TABLE IF NOT EXISTS entry_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entry_id INT NOT NULL,
  tag VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entry_id) REFERENCES travel_entries(id) ON DELETE CASCADE,
  UNIQUE KEY unique_entry_tag (entry_id, tag),
  INDEX idx_tag (tag),
  INDEX idx_entry_id (entry_id)
);

-- Sample data (optional - remove if not needed)
-- INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES
-- ('demo_user', 'demo@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5h4dBvgJNa', 'Demo', 'User');

-- Show tables
SHOW TABLES;
