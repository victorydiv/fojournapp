-- Enhanced checklist schema for template library system
-- This extends the existing checklist system to support the template workflow

-- Table for user's private template library (saved public templates)
CREATE TABLE IF NOT EXISTS user_template_library (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  original_template_id INT NOT NULL, -- references the public template
  saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  custom_title VARCHAR(255) NULL, -- user can customize the title
  custom_description TEXT NULL, -- user can customize the description
  custom_category ENUM('general', 'packing', 'planning', 'activities', 'documents', 'food', 'other') NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (original_template_id) REFERENCES checklists(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_template (user_id, original_template_id),
  INDEX idx_user_library (user_id),
  INDEX idx_template_saves (original_template_id)
);

-- Table for checklist instances (when templates are attached to journeys/dreams)
CREATE TABLE IF NOT EXISTS checklist_instances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL, -- owner of this instance
  template_id INT NOT NULL, -- references original template or user's private checklist
  instance_type ENUM('journey', 'dream', 'standalone') NOT NULL,
  instance_reference_id INT NULL, -- journey_id or dream_id depending on type
  title VARCHAR(255) NOT NULL, -- copied from template but can be customized
  description TEXT NULL,
  category ENUM('general', 'packing', 'planning', 'activities', 'documents', 'food', 'other') DEFAULT 'general',
  color VARCHAR(7) DEFAULT '#1976d2',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES checklists(id) ON DELETE CASCADE,
  INDEX idx_user_instances (user_id),
  INDEX idx_template_instances (template_id),
  INDEX idx_instance_reference (instance_type, instance_reference_id)
);

-- Table for checklist instance items (separate from template items)
CREATE TABLE IF NOT EXISTS checklist_instance_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  instance_id INT NOT NULL,
  text VARCHAR(500) NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  category VARCHAR(100),
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  due_date DATE NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (instance_id) REFERENCES checklist_instances(id) ON DELETE CASCADE,
  INDEX idx_instance_items (instance_id),
  INDEX idx_sort_order (instance_id, sort_order),
  INDEX idx_completion (instance_id, is_completed)
);

-- Add template usage statistics
ALTER TABLE checklists ADD COLUMN  usage_count INT DEFAULT 0;
ALTER TABLE checklists ADD COLUMN  last_used_at TIMESTAMP NULL;

-- Add indexes for better performance
CREATE INDEX  idx_public_templates ON checklists (is_public, is_template);
CREATE INDEX  idx_template_stats ON checklists (usage_count DESC, created_at DESC);
