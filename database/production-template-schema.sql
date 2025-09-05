-- PRODUCTION DEPLOYMENT: Template System Schema
-- Run this SQL file in production to create the template system tables

USE victorydiv24_travel_log2;

-- Create templates table (independent from checklists)
CREATE TABLE IF NOT EXISTS templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  creator_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category ENUM('general', 'packing', 'planning', 'activities', 'documents', 'food', 'other') DEFAULT 'general',
  color VARCHAR(7) DEFAULT '#1976d2',
  usage_count INT DEFAULT 0,
  last_used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_category (category),
  INDEX idx_creator (creator_id),
  INDEX idx_usage (usage_count),
  INDEX idx_created (created_at)
);

-- Create template items table
CREATE TABLE IF NOT EXISTS template_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_id INT NOT NULL,
  text TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
  INDEX idx_template (template_id),
  INDEX idx_sort (sort_order)
);

-- Create user_template_library table for saved templates
-- IMPORTANT: Uses original_template_id (not template_id) to match current backend code
CREATE TABLE IF NOT EXISTS user_template_library (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  original_template_id INT NOT NULL,
  saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  custom_title VARCHAR(255),
  custom_description TEXT,
  custom_category ENUM('general', 'packing', 'planning', 'activities', 'documents', 'food', 'other'),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (original_template_id) REFERENCES templates(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_template (user_id, original_template_id),
  INDEX idx_user (user_id),
  INDEX idx_template (original_template_id)
);
