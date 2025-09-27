-- Migration: Create static pages table for managing About, Privacy, etc.
-- Date: 2025-09-25
-- Run this in your MySQL database

-- Create the static_pages table
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
INSERT IGNORE INTO static_pages (slug, title, content, meta_title, meta_description, is_published) VALUES 
('about', 'About Fojourn', 
 '<div class="static-page-content">
    <h1>About Fojourn</h1>
    <p>Welcome to Fojourn, your personal digital travel companion designed to help you capture, organize, and share your most precious travel memories.</p>
    
    <h2>Our Mission</h2>
    <p>We believe that every journey, no matter how big or small, has a story worth telling. Fojourn makes it easy to document your adventures, from spontaneous day trips to epic journeys around the world, ensuring that no memory is ever lost.</p>
    
    <h2>What Makes Fojourn Special</h2>
    <ul>
      <li><strong>Interactive Travel Maps:</strong> Pin your locations and see your adventures come to life on beautiful, interactive maps</li>
      <li><strong>Rich Media Storage:</strong> Upload photos, videos, and notes to create comprehensive travel entries</li>
      <li><strong>Journey Planning:</strong> Plan your trips with our integrated planning tools and checklists</li>
      <li><strong>Social Sharing:</strong> Share your favorite memories and discover amazing destinations from fellow travelers</li>
      <li><strong>Dream Destinations:</strong> Keep track of places you want to visit and turn dreams into reality</li>
      <li><strong>Achievement System:</strong> Earn badges and celebrate your travel milestones</li>
    </ul>
    
    <h2>Your Privacy Matters</h2>
    <p>Your memories are personal, and we respect that. You have complete control over what you share publicly and what remains private. Our platform is built with privacy and security at its core.</p>
    
    <h2>Join Our Community</h2>
    <p>Whether you\'re a weekend explorer, a digital nomad, or planning your first big adventure, Fojourn is here to help you make the most of every journey. Start documenting your travels today and build a beautiful collection of memories that will last a lifetime.</p>
  </div>', 
 'About Fojourn - Your Digital Travel Journal & Memory Keeper',
 'Discover Fojourn, the ultimate digital travel journal for capturing, organizing, and sharing your travel memories with interactive maps, photos, and social features.',
 true),

('privacy', 'Privacy Policy', 
 '<div class="static-page-content">
    <h1>Privacy Policy</h1>
    <p><strong>Last updated:</strong> September 25, 2025</p>
    
    <h2>Introduction</h2>
    <p>At Fojourn, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our travel journal platform.</p>
    
    <h2>Information We Collect</h2>
    <h3>Personal Information</h3>
    <ul>
      <li>Account information (name, email, username)</li>
      <li>Profile information (avatar, bio, preferences)</li>
      <li>Travel entries (locations, notes, photos, videos)</li>
      <li>Usage data and analytics</li>
    </ul>
    
    <h3>Automatically Collected Information</h3>
    <ul>
      <li>Device information and browser type</li>
      <li>IP address and location data (when permitted)</li>
      <li>Cookies and similar tracking technologies</li>
    </ul>
    
    <h2>How We Use Your Information</h2>
    <p>We use your information to:</p>
    <ul>
      <li>Provide and maintain our service</li>
      <li>Process your transactions and manage your account</li>
      <li>Send you technical notices and support messages</li>
      <li>Respond to your comments and questions</li>
      <li>Improve our platform and develop new features</li>
    </ul>
    
    <h2>Information Sharing and Disclosure</h2>
    <p>We respect your privacy and do not sell your personal information. We may share your information only in the following circumstances:</p>
    <ul>
      <li><strong>Public Content:</strong> Travel entries you mark as public will be visible to other users</li>
      <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
      <li><strong>Service Providers:</strong> With trusted partners who help us operate our platform</li>
    </ul>
    
    <h2>Data Security</h2>
    <p>We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
    
    <h2>Your Rights and Choices</h2>
    <ul>
      <li>Access and update your account information</li>
      <li>Control privacy settings for your content</li>
      <li>Request deletion of your account and data</li>
      <li>Opt out of non-essential communications</li>
    </ul>
    
    <h2>Data Retention</h2>
    <p>We retain your information for as long as your account is active or as needed to provide our services. You may request deletion of your data at any time through your account settings.</p>
    
    <h2>Children\'s Privacy</h2>
    <p>Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.</p>
    
    <h2>Changes to This Policy</h2>
    <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.</p>
    
    <h2>Contact Us</h2>
    <p>If you have any questions about this Privacy Policy, please contact us through our support channels or email us directly.</p>
  </div>', 
 'Privacy Policy - How Fojourn Protects Your Data',
 'Learn how Fojourn collects, uses, and protects your personal information and travel data. Read our comprehensive privacy policy for complete details.',
 true);

-- Verify the migration was successful
SELECT 'Static pages table created and populated successfully' as status;
SELECT id, slug, title, is_published, created_at FROM static_pages ORDER BY id;