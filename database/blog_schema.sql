-- Blog system database schema
-- Creates tables for blog posts and related functionality

-- Blog posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  excerpt TEXT,
  content LONGTEXT NOT NULL,
  hero_image_url VARCHAR(500),
  hero_image_filename VARCHAR(255),
  author_id INT NOT NULL,
  status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
  featured BOOLEAN DEFAULT FALSE,
  published_at DATETIME,
  seo_title VARCHAR(100),
  seo_description VARCHAR(160),
  tags JSON,
  reading_time INT, -- estimated reading time in minutes
  view_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_slug (slug),
  INDEX idx_status_published (status, published_at),
  INDEX idx_featured (featured),
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Blog categories table
CREATE TABLE IF NOT EXISTS blog_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7), -- hex color code
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Blog post categories junction table
CREATE TABLE IF NOT EXISTS blog_post_categories (
  blog_post_id INT NOT NULL,
  category_id INT NOT NULL,
  PRIMARY KEY (blog_post_id, category_id),
  FOREIGN KEY (blog_post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES blog_categories(id) ON DELETE CASCADE
);

-- Insert default categories
INSERT IGNORE INTO blog_categories (name, slug, description, color) VALUES
('Travel Tips', 'travel-tips', 'Helpful tips and advice for travelers', '#2196F3'),
('Destinations', 'destinations', 'Featured destinations and travel guides', '#4CAF50'),
('Food & Culture', 'food-culture', 'Local cuisine and cultural experiences', '#FF5722'),
('Adventure', 'adventure', 'Adventure travel and outdoor activities', '#FF9800'),
('Budget Travel', 'budget-travel', 'Money-saving tips and budget-friendly travel', '#9C27B0'),
('Travel Stories', 'travel-stories', 'Personal travel experiences and stories', '#E91E63');

-- Blog views tracking for analytics
CREATE TABLE IF NOT EXISTS blog_post_views (
  id INT PRIMARY KEY AUTO_INCREMENT,
  blog_post_id INT NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  referer VARCHAR(500),
  viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (blog_post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
  INDEX idx_post_date (blog_post_id, viewed_at)
);
