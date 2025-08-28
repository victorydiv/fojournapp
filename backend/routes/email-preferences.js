const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get user email preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT email_notifications, email_marketing, email_announcements, 
              email_preferences_updated_at 
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      preferences: {
        notifications: rows[0].email_notifications,
        marketing: rows[0].email_marketing,
        announcements: rows[0].email_announcements,
        lastUpdated: rows[0].email_preferences_updated_at
      }
    });
  } catch (error) {
    console.error('Error fetching email preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user email preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const { notifications, marketing, announcements } = req.body;

    // Validate preferences
    if (typeof notifications !== 'boolean' || 
        typeof marketing !== 'boolean' || 
        typeof announcements !== 'boolean') {
      return res.status(400).json({ error: 'All preferences must be boolean values' });
    }

    await db.execute(
      `UPDATE users 
       SET email_notifications = ?, 
           email_marketing = ?, 
           email_announcements = ?,
           email_preferences_updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [notifications, marketing, announcements, req.user.id]
    );

    res.json({ 
      message: 'Email preferences updated successfully',
      preferences: { notifications, marketing, announcements }
    });
  } catch (error) {
    console.error('Error updating email preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate new unsubscribe token (for security)
router.post('/generate-unsubscribe-token', authenticateToken, async (req, res) => {
  try {
    const crypto = require('crypto');
    const newToken = crypto.randomBytes(32).toString('hex');

    await db.execute(
      'UPDATE users SET unsubscribe_token = ? WHERE id = ?',
      [newToken, req.user.id]
    );

    res.json({ message: 'New unsubscribe token generated', token: newToken });
  } catch (error) {
    console.error('Error generating unsubscribe token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Public unsubscribe endpoint (no auth required)
router.get('/unsubscribe/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { type = 'all' } = req.query; // 'all', 'marketing', 'announcements', 'notifications'

    // Find user by unsubscribe token
    const [rows] = await db.execute(
      'SELECT id, email, first_name FROM users WHERE unsubscribe_token = ?',
      [token]
    );

    if (rows.length === 0) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invalid Unsubscribe Link</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                .error { color: #d32f2f; }
            </style>
        </head>
        <body>
            <h2 class="error">Invalid Unsubscribe Link</h2>
            <p>This unsubscribe link is invalid or has expired. Please contact support if you continue to receive unwanted emails.</p>
            <p><a href="https://fojourn.site">Return to Fojourn</a></p>
        </body>
        </html>
      `);
    }

    const user = rows[0];
    
    // Update preferences based on type
    let updateQuery = '';
    let updateValues = [];
    
    switch (type) {
      case 'marketing':
        updateQuery = 'UPDATE users SET email_marketing = FALSE, email_preferences_updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        updateValues = [user.id];
        break;
      case 'announcements':
        updateQuery = 'UPDATE users SET email_announcements = FALSE, email_preferences_updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        updateValues = [user.id];
        break;
      case 'notifications':
        updateQuery = 'UPDATE users SET email_notifications = FALSE, email_preferences_updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        updateValues = [user.id];
        break;
      case 'all':
      default:
        updateQuery = `UPDATE users 
                       SET email_notifications = FALSE, 
                           email_marketing = FALSE, 
                           email_announcements = FALSE,
                           email_preferences_updated_at = CURRENT_TIMESTAMP 
                       WHERE id = ?`;
        updateValues = [user.id];
        break;
    }

    await db.execute(updateQuery, updateValues);

    // Return success page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>Successfully Unsubscribed</title>
          <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .success { color: #2e7d32; }
              .info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
              .btn { display: inline-block; background: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
          </style>
      </head>
      <body>
          <h2 class="success">Successfully Unsubscribed</h2>
          <p>Hello ${user.first_name || user.email},</p>
          <p>You have successfully unsubscribed from ${type === 'all' ? 'all' : type} emails from Fojourn.</p>
          
          <div class="info">
              <strong>What happens next?</strong>
              <ul>
                  <li>You will no longer receive ${type === 'all' ? 'any' : type} emails from us</li>
                  <li>You can update your preferences anytime by logging into your account</li>
                  <li>Important account security notifications may still be sent</li>
              </ul>
          </div>
          
          <p>
              <a href="https://fojourn.site/login" class="btn">Login to Your Account</a>
              <a href="https://fojourn.site" class="btn" style="background: #666; margin-left: 10px;">Return to Fojourn</a>
          </p>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
              If you unsubscribed by mistake, you can re-enable email preferences in your account settings.
          </p>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('Error processing unsubscribe:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>Unsubscribe Error</title>
          <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .error { color: #d32f2f; }
          </style>
      </head>
      <body>
          <h2 class="error">Unsubscribe Error</h2>
          <p>An error occurred while processing your unsubscribe request. Please try again later or contact support.</p>
          <p><a href="https://fojourn.site">Return to Fojourn</a></p>
      </body>
      </html>
    `);
  }
});

// Get unsubscribe token for current user (for generating unsubscribe links)
router.get('/unsubscribe-token', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT unsubscribe_token FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    let token = rows[0].unsubscribe_token;
    
    // Generate token if it doesn't exist
    if (!token) {
      const crypto = require('crypto');
      token = crypto.randomBytes(32).toString('hex');
      
      await db.execute(
        'UPDATE users SET unsubscribe_token = ? WHERE id = ?',
        [token, req.user.id]
      );
    }

    res.json({ 
      token,
      unsubscribeUrls: {
        all: `${process.env.API_BASE_URL || 'https://fojourn.site/api'}/email-preferences/unsubscribe/${token}?type=all`,
        marketing: `${process.env.API_BASE_URL || 'https://fojourn.site/api'}/email-preferences/unsubscribe/${token}?type=marketing`,
        announcements: `${process.env.API_BASE_URL || 'https://fojourn.site/api'}/email-preferences/unsubscribe/${token}?type=announcements`,
        notifications: `${process.env.API_BASE_URL || 'https://fojourn.site/api'}/email-preferences/unsubscribe/${token}?type=notifications`
      }
    });
  } catch (error) {
    console.error('Error fetching unsubscribe token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
