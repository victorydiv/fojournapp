-- Hero Images Management Schema
-- For dynamic landing page hero section

CREATE TABLE IF NOT EXISTS hero_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  title VARCHAR(200),
  subtitle VARCHAR(300),
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  uploaded_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_active_order (is_active, display_order),
  INDEX idx_created_at (created_at)
);

-- Default gradient fallback record (no actual image)
INSERT IGNORE INTO hero_images (
  id, 
  filename, 
  original_name, 
  image_url, 
  title, 
  subtitle, 
  display_order, 
  is_active, 
  uploaded_by
) VALUES (
  1,
  'gradient-fallback',
  'Default Gradient',
  '',
  'Document Your Adventures',
  'Turn every journey into a story worth sharing',
  0,
  true,
  1
);
