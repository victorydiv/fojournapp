-- Communications System Schema
-- Execute this in your MySQL client

-- Table for storing email templates
CREATE TABLE IF NOT EXISTS email_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  html_content TEXT NOT NULL,
  css_styles TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_created_by (created_by),
  INDEX idx_is_default (is_default)
);

-- Table for tracking sent emails
CREATE TABLE IF NOT EXISTS sent_emails (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_id INT,
  sender_id INT NOT NULL,
  subject VARCHAR(500) NOT NULL,
  html_content TEXT NOT NULL,
  recipient_type ENUM('all', 'selected', 'single') NOT NULL,
  recipient_count INT DEFAULT 0,
  status ENUM('pending', 'sending', 'completed', 'failed') DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE SET NULL,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sender_id (sender_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Table for tracking individual email recipients
CREATE TABLE IF NOT EXISTS email_recipients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sent_email_id INT NOT NULL,
  user_id INT NOT NULL,
  email_address VARCHAR(255) NOT NULL,
  delivery_status ENUM('pending', 'sent', 'failed', 'bounced') DEFAULT 'pending',
  sent_at TIMESTAMP NULL,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sent_email_id) REFERENCES sent_emails(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sent_email_id (sent_email_id),
  INDEX idx_user_id (user_id),
  INDEX idx_delivery_status (delivery_status)
);

-- Table for announcements
CREATE TABLE IF NOT EXISTS announcements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  content_type ENUM('html', 'markdown', 'text') DEFAULT 'html',
  announcement_type ENUM('info', 'warning', 'success', 'error', 'feature') DEFAULT 'info',
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  priority INT DEFAULT 0,
  target_audience ENUM('all', 'users', 'admins') DEFAULT 'all',
  start_date TIMESTAMP NULL,
  end_date TIMESTAMP NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_is_active (is_active),
  INDEX idx_is_featured (is_featured),
  INDEX idx_priority (priority),
  INDEX idx_target_audience (target_audience),
  INDEX idx_dates (start_date, end_date),
  INDEX idx_created_by (created_by)
);

-- Table for tracking which users have seen announcements
CREATE TABLE IF NOT EXISTS announcement_views (
  id INT PRIMARY KEY AUTO_INCREMENT,
  announcement_id INT NOT NULL,
  user_id INT NOT NULL,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_announcement (announcement_id, user_id),
  INDEX idx_announcement_id (announcement_id),
  INDEX idx_user_id (user_id)
);

-- Insert default email template (only if an admin user exists)
INSERT INTO email_templates (name, subject, html_content, css_styles, is_default, created_by) 
SELECT 
  'Default Fojourn Template',
  'News from Fojourn',
  '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <img src="{{logo_url}}" alt="Fojourn" class="logo">
            <h1>{{title}}</h1>
        </div>
        <div class="content">
            {{content}}
        </div>
        <div class="footer">
            <p>Best regards,<br>The Fojourn Team</p>
            <p><a href="{{unsubscribe_url}}">Unsubscribe</a> | <a href="{{website_url}}">Visit Fojourn</a></p>
        </div>
    </div>
</body>
</html>',
  '.email-container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
.header { background: #1976d2; color: white; padding: 20px; text-align: center; }
.logo { max-width: 150px; height: auto; }
.content { padding: 30px 20px; background: #ffffff; }
.footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 14px; color: #666; }
.footer a { color: #1976d2; text-decoration: none; }',
  TRUE,
  u.id
FROM users u 
WHERE u.is_admin = TRUE 
  AND EXISTS (SELECT 1 FROM users WHERE is_admin = TRUE)
LIMIT 1;
