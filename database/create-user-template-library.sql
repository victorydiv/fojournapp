-- Create user_template_library table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_template_library (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  original_template_id INT NOT NULL,
  custom_title VARCHAR(255),
  custom_description TEXT,
  custom_category VARCHAR(50),
  saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_template (user_id, original_template_id),
  UNIQUE KEY unique_user_template (user_id, original_template_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (original_template_id) REFERENCES checklists(id) ON DELETE CASCADE
);

-- Also ensure checklist_instances table exists
CREATE TABLE IF NOT EXISTS checklist_instances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  template_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  instance_type ENUM('standalone', 'journey', 'dream') DEFAULT 'standalone',
  instance_reference_id INT,
  color VARCHAR(7) DEFAULT '#1976d2',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_instances (user_id),
  INDEX idx_template_instances (template_id),
  INDEX idx_instance_reference (instance_type, instance_reference_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES checklists(id) ON DELETE CASCADE
);

-- And checklist_instance_items table
CREATE TABLE IF NOT EXISTS checklist_instance_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  instance_id INT NOT NULL,
  text TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  category VARCHAR(50),
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_instance_items (instance_id),
  INDEX idx_item_completion (instance_id, is_completed),
  FOREIGN KEY (instance_id) REFERENCES checklist_instances(id) ON DELETE CASCADE
);

-- Verify tables were created
SHOW TABLES LIKE '%template%';
SHOW TABLES LIKE '%instance%';
