const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Gmail configuration (you can also use other providers)
    if (process.env.EMAIL_SERVICE === 'gmail') {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_APP_PASSWORD // Use App Password, not regular password
        }
      });
    }
    // SMTP configuration (for custom email servers)
    else if (process.env.EMAIL_SERVICE === 'smtp' || process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });
    }
    // DreamHost email configuration
    else if (process.env.EMAIL_SERVICE === 'dreamhost') {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.dreamhost.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER, // your@fojourn.site
          pass: process.env.EMAIL_PASSWORD
        }
      });
    }
    // Sendgrid configuration
    else if (process.env.EMAIL_SERVICE === 'sendgrid') {
      this.transporter = nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      });
    }
    // Default fallback (you might want to use a service like SendGrid in production)
    else {
      console.warn('No email service configured. Email functionality will be disabled.');
      this.transporter = null;
    }
  }

  async sendPasswordResetEmail(email, resetToken, username) {
    if (!this.transporter) {
      console.error('Email service not configured');
      return false;
    }

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"Fojourn App" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Fojourn - Password Reset Request',
      replyTo: process.env.SMTP_USER || process.env.EMAIL_USER,
      headers: {
        'X-Mailer': 'Fojourn Application',
        'X-Priority': '1',
        'X-MSMail-Priority': 'High'
      },
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Password Reset</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #007bff; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { 
              display: inline-block; 
              background: #007bff; 
              color: white; 
              padding: 12px 30px; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0; 
            }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🗺️ Fojourn</h1>
            </div>
            <div class="content">
              <h2>Password Reset Request</h2>
              <p>Hello ${username},</p>
              <p>We received a request to reset your password for your Fojourn account.</p>
              <p>Click the button below to reset your password:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>
              <p>Or copy and paste this link into your browser:</p>
              <p><a href="${resetUrl}">${resetUrl}</a></p>
              <p><strong>This link will expire in 1 hour.</strong></p>
              <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Fojourn. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
  }

  async sendWelcomeEmail(email, username) {
    if (!this.transporter) {
      console.error('Email service not configured');
      return false;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to Fojourn!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to Fojourn</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #28a745; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { 
              display: inline-block; 
              background: #28a745; 
              color: white; 
              padding: 12px 30px; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0; 
            }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🗺️ Welcome to Fojourn!</h1>
            </div>
            <div class="content">
              <h2>Hello ${username}!</h2>
              <p>Welcome to Fojourn - your personal travel companion!</p>
              <p>You can now:</p>
              <ul>
                <li>📍 Log your travel experiences with photos and videos</li>
                <li>🗺️ Pin locations on interactive maps</li>
                <li>💭 Create and manage your travel dreams</li>
                <li>🤝 Collaborate with friends on journeys</li>
                <li>🔍 Search and discover your memories</li>
              </ul>
              <a href="${process.env.FRONTEND_URL}" class="button">Start Your Journey</a>
              <p>Happy travels!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Fojourn. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Welcome email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return false;
    }
  }

  async sendShareEmail(email, sharedBy, entryTitle, shareUrl) {
    if (!this.transporter) {
      console.error('Email service not configured');
      return false;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: `${sharedBy} shared a travel memory with you`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Travel Memory Shared</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #17a2b8; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { 
              display: inline-block; 
              background: #17a2b8; 
              color: white; 
              padding: 12px 30px; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0; 
            }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🗺️ Travel Memory Shared</h1>
            </div>
            <div class="content">
              <h2>You've received a travel memory!</h2>
              <p><strong>${sharedBy}</strong> has shared their travel experience with you:</p>
              <h3>"${entryTitle}"</h3>
              <p>Click the button below to view this travel memory:</p>
              <a href="${shareUrl}" class="button">View Travel Memory</a>
              <p>Or copy and paste this link into your browser:</p>
              <p><a href="${shareUrl}">${shareUrl}</a></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Fojourn. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Share email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Error sending share email:', error);
      return false;
    }
  }

  // Generic method for sending custom emails (for communications system)
  async sendEmail(to, subject, htmlContent, textContent = null) {
    if (!this.transporter) {
      throw new Error('Email service not configured');
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: to,
      subject: subject,
      html: htmlContent,
      text: textContent || htmlContent.replace(/<[^>]*>/g, '') // Strip HTML for text version
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${to}`);
      return result;
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  async testConnection() {
    if (!this.transporter) {
      console.log('No email transporter configured');
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('Email service connection successful');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
