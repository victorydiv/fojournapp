-- Checklist feature database schema
-- This creates tables for custom checklists that can be attached to journeys or activities

-- Main checklists table
CREATE TABLE IF NOT EXISTS checklists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category ENUM('general', 'packing', 'planning', 'activities', 'documents', 'food', 'other') DEFAULT 'general',
  is_template BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  color VARCHAR(7) DEFAULT '#1976d2', -- hex color for visual organization
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_checklists (user_id),
  INDEX idx_public_checklists (is_public, is_template),
  INDEX idx_category (category)
);

-- Checklist items table
CREATE TABLE IF NOT EXISTS checklist_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  checklist_id INT NOT NULL,
  text VARCHAR(500) NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  category VARCHAR(100), -- optional sub-category within the checklist
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  due_date DATE NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE CASCADE,
  INDEX idx_checklist_items (checklist_id),
  INDEX idx_sort_order (checklist_id, sort_order),
  INDEX idx_completion (checklist_id, is_completed)
);

-- Junction table for journey-checklist associations
CREATE TABLE IF NOT EXISTS journey_checklists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  journey_id INT NOT NULL,
  checklist_id INT NOT NULL,
  attached_by INT NOT NULL, -- user who attached the checklist
  attached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE,
  FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE CASCADE,
  FOREIGN KEY (attached_by) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_journey_checklist (journey_id, checklist_id),
  INDEX idx_journey_checklists (journey_id),
  INDEX idx_checklist_journeys (checklist_id)
);

-- Junction table for journey experience-checklist associations
CREATE TABLE IF NOT EXISTS journey_experience_checklists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  journey_experience_id INT NOT NULL,
  checklist_id INT NOT NULL,
  attached_by INT NOT NULL, -- user who attached the checklist
  attached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (journey_experience_id) REFERENCES journey_experiences(id) ON DELETE CASCADE,
  FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE CASCADE,
  FOREIGN KEY (attached_by) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_experience_checklist (journey_experience_id, checklist_id),
  INDEX idx_experience_checklists (journey_experience_id),
  INDEX idx_checklist_experiences (checklist_id)
);

-- Junction table for dream-checklist associations
CREATE TABLE IF NOT EXISTS dream_checklists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dream_id INT NOT NULL,
  checklist_id INT NOT NULL,
  attached_by INT NOT NULL, -- user who attached the checklist
  attached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dream_id) REFERENCES dreams(id) ON DELETE CASCADE,
  FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE CASCADE,
  FOREIGN KEY (attached_by) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_dream_checklist (dream_id, checklist_id),
  INDEX idx_dream_checklists (dream_id),
  INDEX idx_checklist_dreams (checklist_id)
);

-- Checklist sharing/templates table for public sharing
CREATE TABLE IF NOT EXISTS checklist_shares (
  id INT AUTO_INCREMENT PRIMARY KEY,
  checklist_id INT NOT NULL,
  share_token VARCHAR(255) UNIQUE NOT NULL, -- for public sharing URLs
  is_active BOOLEAN DEFAULT TRUE,
  view_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL, -- optional expiration
  FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE CASCADE,
  INDEX idx_share_token (share_token),
  INDEX idx_checklist_shares (checklist_id)
);

-- Add checklist-related columns to existing tables if needed
-- ALTER TABLE users ADD COLUMN checklist_preferences JSON DEFAULT NULL; -- for user preferences like default colors, etc.
