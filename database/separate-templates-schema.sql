-- Enhanced template system with separate templates table
-- This allows checklists and templates to have independent lifecycles

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
CREATE TABLE IF NOT EXISTS user_template_library (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  template_id INT NOT NULL,
  saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_template (user_id, template_id),
  INDEX idx_user (user_id),
  INDEX idx_template (template_id)
);

-- Remove is_template and is_public columns from checklists table since templates are now separate
-- (We'll keep them for now to avoid breaking existing functionality, but they'll be deprecated)

-- Migration script to move existing public templates to new templates table
-- This will be run separately to migrate existing data
