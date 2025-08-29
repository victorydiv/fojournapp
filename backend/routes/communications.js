const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const emailService = require('../utils/emailService');
const path = require('path');
const multer = require('multer');
const fs = require('fs').promises;

const router = express.Router();

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    const [users] = await pool.execute(
      'SELECT is_admin FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!users.length || !users[0].is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ============ EMAIL IMAGE UPLOADS ============

// Configure multer for email image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/email-images');
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = path.extname(file.originalname);
    cb(null, `email-${timestamp}-${randomString}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed for emails'), false);
  }
};

const emailImageUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for email images
  }
});

// Upload image for email content
router.post('/upload-image', authenticateToken, requireAdmin, emailImageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    // Use FRONTEND_URL from environment for email templates (absolute URLs required for email clients)
    const isDevelopment = process.env.NODE_ENV === 'development';
    const baseUrl = isDevelopment 
      ? 'http://localhost:3001' 
      : (process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`);
    
    const imageUrl = `${baseUrl}/api/communications/email-images/${req.file.filename}`;
    
    console.log('Image uploaded successfully:', {
      filename: req.file.filename,
      imageUrl: imageUrl,
      environment: process.env.NODE_ENV,
      frontendUrl: process.env.FRONTEND_URL
    });
    
    res.json({ 
      location: imageUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('Error uploading email image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Serve uploaded email images publicly
router.get('/email-images/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads/email-images', filename);
    
    // Set headers for public access and caching
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'public, max-age=86400'); // 24 hours
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error serving email image:', err);
        res.status(404).json({ error: 'Image not found' });
      }
    });
  } catch (error) {
    console.error('Error serving email image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ EMAIL TEMPLATES ============

// Get all email templates
router.get('/templates', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [templates] = await pool.execute(`
      SELECT et.*, u.username as created_by_username
      FROM email_templates et
      JOIN users u ON et.created_by = u.id
      ORDER BY et.is_default DESC, et.created_at DESC
    `);

    res.json({ templates });
  } catch (error) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({ error: 'Failed to fetch email templates' });
  }
});

// Get single email template
router.get('/templates/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [templates] = await pool.execute(`
      SELECT et.*, u.username as created_by_username
      FROM email_templates et
      JOIN users u ON et.created_by = u.id
      WHERE et.id = ?
    `, [req.params.id]);

    if (templates.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ template: templates[0] });
  } catch (error) {
    console.error('Error fetching email template:', error);
    res.status(500).json({ error: 'Failed to fetch email template' });
  }
});

// Create new email template
router.post('/templates', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, subject, html_content, css_styles, is_default } = req.body;

    if (!name || !subject || !html_content) {
      return res.status(400).json({ error: 'Name, subject, and content are required' });
    }

    // If setting as default, unset current default
    if (is_default) {
      await pool.execute('UPDATE email_templates SET is_default = FALSE');
    }

    const [result] = await pool.execute(`
      INSERT INTO email_templates (name, subject, html_content, css_styles, is_default, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [name, subject, html_content, css_styles || '', is_default || false, req.user.id]);

    res.status(201).json({ 
      message: 'Email template created successfully',
      templateId: result.insertId 
    });
  } catch (error) {
    console.error('Error creating email template:', error);
    res.status(500).json({ error: 'Failed to create email template' });
  }
});

// Update email template
router.put('/templates/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, subject, html_content, css_styles, is_default } = req.body;
    const templateId = req.params.id;

    console.log(`Updating template ${templateId}:`, {
      name,
      subject,
      html_content_length: html_content ? html_content.length : 0,
      css_styles_length: css_styles ? css_styles.length : 0,
      is_default
    });

    if (!name || !subject || !html_content) {
      return res.status(400).json({ error: 'Name, subject, and content are required' });
    }

    // If setting as default, unset current default
    if (is_default) {
      await pool.execute('UPDATE email_templates SET is_default = FALSE WHERE id != ?', [templateId]);
    }

    const [result] = await pool.execute(`
      UPDATE email_templates 
      SET name = ?, subject = ?, html_content = ?, css_styles = ?, is_default = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, subject, html_content, css_styles || '', is_default || false, templateId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    console.log(`Template ${templateId} updated successfully`);
    res.json({ message: 'Email template updated successfully' });
  } catch (error) {
    console.error('Error updating email template:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState
    });
    res.status(500).json({ error: 'Failed to update email template' });
  }
});

// Delete email template
router.delete('/templates/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const templateId = req.params.id;

    // Check if it's the default template
    const [template] = await pool.execute('SELECT is_default FROM email_templates WHERE id = ?', [templateId]);
    
    if (template.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (template[0].is_default) {
      return res.status(400).json({ error: 'Cannot delete the default template' });
    }

    const [result] = await pool.execute('DELETE FROM email_templates WHERE id = ?', [templateId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ message: 'Email template deleted successfully' });
  } catch (error) {
    console.error('Error deleting email template:', error);
    res.status(500).json({ error: 'Failed to delete email template' });
  }
});

// ============ EMAIL SENDING ============

// Get users for email targeting
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [users] = await pool.execute(`
      SELECT id, username, email, first_name, last_name, created_at
      FROM users 
      WHERE is_active = TRUE
      ORDER BY username ASC
    `);

    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Send email to users
router.post('/send-email', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      template_id, 
      subject, 
      html_content, 
      recipient_type, 
      selected_users,
      dynamic_content,
      dynamic_title,
      email_type // Add email type parameter: 'notifications', 'marketing', 'announcements'
    } = req.body;

    if (!subject || !html_content || !recipient_type) {
      return res.status(400).json({ error: 'Subject, content, and recipient type are required' });
    }

    // Validate email type
    const validEmailTypes = ['notifications', 'marketing', 'announcements'];
    if (email_type && !validEmailTypes.includes(email_type)) {
      return res.status(400).json({ error: 'Invalid email type. Must be notifications, marketing, or announcements' });
    }

    // Get recipients based on type and email preferences
    let recipients = [];
    if (recipient_type === 'all') {
      let query = `
        SELECT id, email, first_name, last_name 
        FROM users 
        WHERE is_active = TRUE
      `;
      
      // Add email preference filter if email type is specified
      if (email_type) {
        const preferenceColumn = `email_${email_type}`;
        query += ` AND ${preferenceColumn} = TRUE`;
      }
      
      const [users] = await pool.execute(query);
      recipients = users;
    } else if (recipient_type === 'selected' && selected_users && selected_users.length > 0) {
      const placeholders = selected_users.map(() => '?').join(',');
      let query = `
        SELECT id, email, first_name, last_name 
        FROM users 
        WHERE id IN (${placeholders}) AND is_active = TRUE
      `;
      
      // Add email preference filter if email type is specified
      if (email_type) {
        const preferenceColumn = `email_${email_type}`;
        query += ` AND ${preferenceColumn} = TRUE`;
      }
      
      const [users] = await pool.execute(query, selected_users);
      recipients = users;
    } else {
      return res.status(400).json({ error: 'Invalid recipient configuration' });
    }

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No valid recipients found' });
    }

    // Create sent_email record
    const [emailResult] = await pool.execute(`
      INSERT INTO sent_emails (template_id, sender_id, subject, html_content, recipient_type, recipient_count, email_type, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [template_id || null, req.user.id, subject, html_content, recipient_type, recipients.length, email_type || null]);

    const sentEmailId = emailResult.insertId;

    // Create recipient records
    const recipientValues = recipients.map(user => [sentEmailId, user.id, user.email]);
    await pool.execute(`
      INSERT INTO email_recipients (sent_email_id, user_id, email_address)
      VALUES ${recipients.map(() => '(?, ?, ?)').join(', ')}
    `, recipientValues.flat());

    // Start sending emails asynchronously
    setImmediate(async () => {
      try {
        await pool.execute('UPDATE sent_emails SET status = "sending" WHERE id = ?', [sentEmailId]);

        let successCount = 0;
        let errorCount = 0;

        for (const recipient of recipients) {
          try {
            // Replace placeholders in email content
            let personalizedContent = html_content
              .replace(/{{first_name}}/g, recipient.first_name || '')
              .replace(/{{last_name}}/g, recipient.last_name || '')
              .replace(/{{email}}/g, recipient.email)
              .replace(/{{username}}/g, recipient.username || '')
              .replace(/{{content}}/g, dynamic_content || '') // Dynamic content injection
              .replace(/{{title}}/g, dynamic_title || ''); // Dynamic title injection

            await emailService.sendEmail(
              recipient.email, 
              subject, 
              personalizedContent,
              personalizedContent
            );

            // Update recipient status
            await pool.execute(`
              UPDATE email_recipients 
              SET delivery_status = 'sent', sent_at = CURRENT_TIMESTAMP 
              WHERE sent_email_id = ? AND user_id = ?
            `, [sentEmailId, recipient.id]);

            successCount++;
          } catch (emailError) {
            console.error(`Failed to send email to ${recipient.email}:`, emailError);
            
            // Update recipient status with error
            await pool.execute(`
              UPDATE email_recipients 
              SET delivery_status = 'failed', error_message = ? 
              WHERE sent_email_id = ? AND user_id = ?
            `, [emailError.message, sentEmailId, recipient.id]);

            errorCount++;
          }
        }

        // Update final status
        const finalStatus = errorCount === 0 ? 'completed' : 'completed';
        const errorMessage = errorCount > 0 ? `${errorCount} emails failed to send` : null;
        
        await pool.execute(`
          UPDATE sent_emails 
          SET status = ?, error_message = ?, sent_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `, [finalStatus, errorMessage, sentEmailId]);

        console.log(`Email campaign ${sentEmailId} completed: ${successCount} sent, ${errorCount} failed`);
      } catch (sendingError) {
        console.error('Error in email sending process:', sendingError);
        await pool.execute(`
          UPDATE sent_emails 
          SET status = 'failed', error_message = ? 
          WHERE id = ?
        `, [sendingError.message, sentEmailId]);
      }
    });

    res.json({ 
      message: `Email queued for ${recipients.length} recipients`,
      sent_email_id: sentEmailId,
      recipient_count: recipients.length
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Get sent emails history
router.get('/sent-emails', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [emails] = await pool.execute(`
      SELECT 
        se.*,
        u.username as sender_username,
        et.name as template_name
      FROM sent_emails se
      JOIN users u ON se.sender_id = u.id
      LEFT JOIN email_templates et ON se.template_id = et.id
      ORDER BY se.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    // Get total count
    const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM sent_emails');
    const total = countResult[0].total;

    res.json({
      emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching sent emails:', error);
    res.status(500).json({ error: 'Failed to fetch sent emails' });
  }
});

// ============ ANNOUNCEMENTS ============

// Get all announcements (admin)
router.get('/announcements', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [announcements] = await pool.execute(`
      SELECT a.*, u.username as created_by_username
      FROM announcements a
      JOIN users u ON a.created_by = u.id
      ORDER BY a.priority DESC, a.created_at DESC
    `);

    res.json({ announcements });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Get active announcements (public)
router.get('/announcements/active', authenticateToken, async (req, res) => {
  try {
    const now = new Date().toISOString();
    const [announcements] = await pool.execute(`
      SELECT a.*, u.username as created_by_username,
             av.viewed_at as user_viewed_at
      FROM announcements a
      JOIN users u ON a.created_by = u.id
      LEFT JOIN announcement_views av ON a.id = av.announcement_id AND av.user_id = ?
      WHERE a.is_active = TRUE
        AND (a.start_date IS NULL OR a.start_date <= ?)
        AND (a.end_date IS NULL OR a.end_date >= ?)
        AND (a.target_audience = 'all' OR 
             (a.target_audience = 'users' AND ? IS NOT NULL) OR
             (a.target_audience = 'admins' AND (SELECT is_admin FROM users WHERE id = ?) = TRUE))
      ORDER BY a.priority DESC, a.created_at DESC
    `, [req.user.id, now, now, req.user.id, req.user.id]);

    res.json({ announcements });
  } catch (error) {
    console.error('Error fetching active announcements:', error);
    res.status(500).json({ error: 'Failed to fetch active announcements' });
  }
});

// Create announcement
router.post('/announcements', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      title, 
      content, 
      content_type, 
      announcement_type, 
      is_active, 
      is_featured, 
      priority, 
      target_audience, 
      start_date, 
      end_date 
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const [result] = await pool.execute(`
      INSERT INTO announcements 
      (title, content, content_type, announcement_type, is_active, is_featured, priority, target_audience, start_date, end_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      title, 
      content, 
      content_type || 'html', 
      announcement_type || 'info', 
      is_active !== false, 
      is_featured || false, 
      priority || 0, 
      target_audience || 'all', 
      start_date || null, 
      end_date || null, 
      req.user.id
    ]);

    res.status(201).json({ 
      message: 'Announcement created successfully',
      announcementId: result.insertId 
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// Update announcement
router.put('/announcements/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      title, 
      content, 
      content_type, 
      announcement_type, 
      is_active, 
      is_featured, 
      priority, 
      target_audience, 
      start_date, 
      end_date 
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const [result] = await pool.execute(`
      UPDATE announcements 
      SET title = ?, content = ?, content_type = ?, announcement_type = ?, 
          is_active = ?, is_featured = ?, priority = ?, target_audience = ?, 
          start_date = ?, end_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      title, 
      content, 
      content_type || 'html', 
      announcement_type || 'info', 
      is_active !== false, 
      is_featured || false, 
      priority || 0, 
      target_audience || 'all', 
      start_date || null, 
      end_date || null, 
      req.params.id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json({ message: 'Announcement updated successfully' });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// Delete announcement
router.delete('/announcements/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM announcements WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

// Mark announcement as viewed
router.post('/announcements/:id/view', authenticateToken, async (req, res) => {
  try {
    await pool.execute(`
      INSERT INTO announcement_views (announcement_id, user_id)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE viewed_at = CURRENT_TIMESTAMP
    `, [req.params.id, req.user.id]);

    res.json({ message: 'Announcement marked as viewed' });
  } catch (error) {
    console.error('Error marking announcement as viewed:', error);
    res.status(500).json({ error: 'Failed to mark announcement as viewed' });
  }
});

module.exports = router;
