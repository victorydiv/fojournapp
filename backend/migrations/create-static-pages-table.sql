-- Migration: Create static pages table for managing About, Privacy, etc.
-- Run this in your MySQL database

CREATE TABLE IF NOT EXISTS static_pages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  content LONGTEXT NOT NULL,
  meta_title VARCHAR(100),
  meta_description VARCHAR(160),
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_slug (slug),
  INDEX idx_published (is_published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default About and Privacy pages
INSERT IGNORE INTO static_pages (slug, title, content, meta_title, meta_description) VALUES 
('about', 'About Fojourn', 
 '<h1>About Fojourn</h1>
  <p>Fojourn is your digital travel companion, helping you capture, organize, and share your travel memories.</p>
  <h2>Our Mission</h2>
  <p>We believe every journey has a story worth telling. Fojourn makes it easy to document your adventures, from quick day trips to epic journeys around the world.</p>
  <h2>Features</h2>
  <ul>
    <li>Interactive travel maps</li>
    <li>Photo and video storage</li>
    <li>Journey planning tools</li>
    <li>Social sharing capabilities</li>
  </ul>', 
 'About Fojourn - Your Digital Travel Journal',
 'Learn about Fojourn, the digital travel journal that helps you capture, organize, and share your travel memories and adventures.'),

('privacy', 'Privacy Policy', 
 '<h1>Privacy Policy</h1>
  <p><strong>Last updated:</strong> September 2025</p>
  <h2>Information We Collect</h2>
  <p>We collect information you provide directly to us, such as when you create an account, add travel entries, or contact us.</p>
  <h2>How We Use Your Information</h2>
  <p>We use the information we collect to provide, maintain, and improve our services.</p>
  <h2>Information Sharing</h2>
  <p>We do not sell, trade, or rent your personal information to third parties.</p>
  <h2>Data Security</h2>
  <p>We implement appropriate security measures to protect your personal information.</p>
  <h2>Contact Us</h2>
  <p>If you have questions about this Privacy Policy, please contact us.</p>', 
 'Privacy Policy - Fojourn',
 'Read Fojourn\'s privacy policy to understand how we collect, use, and protect your personal information and travel data.');

-- Verify the data was inserted
SELECT id, slug, title, is_published FROM static_pages;