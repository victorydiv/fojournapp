const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const emailService = require('../utils/emailService');

const router = express.Router();

// Configure multer for avatar uploads
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Register new user
router.post('/register', [
  body('username').isLength({ min: 3, max: 50 }).trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').optional().isLength({ max: 50 }).trim(),
  body('lastName').optional().isLength({ max: 50 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT username, email FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      let errorMessage = 'User already exists';
      
      if (existingUser.username === username && existingUser.email === email) {
        errorMessage = 'Both username and email are already taken';
      } else if (existingUser.username === username) {
        errorMessage = 'Username is already taken';
      } else if (existingUser.email === email) {
        errorMessage = 'Email is already registered';
      }
      
      return res.status(409).json({ error: errorMessage });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
      [username, email, passwordHash, firstName || null, lastName || null]
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: result.insertId, username, email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Send welcome email (don't wait for it)
    emailService.sendWelcomeEmail(email, username).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: result.insertId,
        username,
        email,
        firstName,
        lastName
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', [
  body('username').notEmpty().trim(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // Find user by username or email
    const [users] = await pool.execute(
      'SELECT id, username, email, password_hash, first_name, last_name, avatar_path, avatar_filename, profile_bio, profile_public FROM users WHERE (username = ? OR email = ?) AND is_active = TRUE',
      [username, username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        avatarPath: user.avatar_path,
        avatarFilename: user.avatar_filename,
        profileBio: user.profile_bio,
        profilePublic: user.profile_public
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, email, first_name, last_name, avatar_path, avatar_filename, profile_bio, profile_public, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    res.json({ 
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        avatarPath: user.avatar_path,
        avatarFilename: user.avatar_filename,
        profileBio: user.profile_bio,
        profilePublic: user.profile_public,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('firstName').optional().isLength({ max: 50 }).trim(),
  body('lastName').optional().isLength({ max: 50 }).trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('profileBio').optional().isLength({ max: 1000 }).trim(),
  body('profilePublic').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, profileBio, profilePublic } = req.body;
    const updates = [];
    const values = [];

    if (firstName !== undefined) {
      updates.push('first_name = ?');
      values.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push('last_name = ?');
      values.push(lastName);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (profileBio !== undefined) {
      updates.push('profile_bio = ?');
      values.push(profileBio);
    }
    if (profilePublic !== undefined) {
      updates.push('profile_public = ?');
      values.push(profilePublic);
      
      // Handle avatar visibility when profile becomes public/private
      const { copyAvatarToPublic, removeAvatarFromPublic } = require('../utils/publicUtils');
      
      if (profilePublic) {
        // Get current avatar filename
        const [users] = await pool.execute(
          'SELECT avatar_filename FROM users WHERE id = ?',
          [req.user.id]
        );
        
        if (users.length > 0 && users[0].avatar_filename) {
          await copyAvatarToPublic(req.user.id, users[0].avatar_filename);
        }
      } else {
        await removeAvatarFromPublic(req.user.id);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(req.user.id);

    await pool.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile update error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// Upload avatar
router.post('/avatar', authenticateToken, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No avatar file provided' });
    }

    const avatarPath = `/uploads/avatars/${req.file.filename}`;
    const avatarFilename = req.file.filename;

    // Delete old avatar if exists
    const [currentUser] = await pool.execute(
      'SELECT avatar_path, avatar_filename FROM users WHERE id = ?',
      [req.user.id]
    );

    if (currentUser.length > 0 && currentUser[0].avatar_path) {
      const oldAvatarPath = path.join(__dirname, '../uploads/avatars', currentUser[0].avatar_filename);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    // Update user avatar in database
    await pool.execute(
      'UPDATE users SET avatar_path = ?, avatar_filename = ? WHERE id = ?',
      [avatarPath, avatarFilename, req.user.id]
    );

    res.json({ 
      message: 'Avatar uploaded successfully',
      avatarPath: avatarPath,
      avatarFilename: avatarFilename
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    // Clean up uploaded file if database update fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Avatar upload failed' });
  }
});

// Change password
router.put('/change-password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    // Get current user password hash
    const [users] = await pool.execute(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.execute(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [newPasswordHash, req.user.id]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Password change failed' });
  }
});

// Get avatar file (with token authentication)
router.get('/avatar/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const token = req.query.token;

    // Verify token if provided
    if (token) {
      try {
        jwt.verify(token, process.env.JWT_SECRET);
      } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    const filePath = path.join(__dirname, '../uploads/avatars', filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Avatar not found' });
    }

    // Set proper CORS headers for cross-origin image requests
    const allowedOrigin = process.env.FRONTEND_URL || process.env.NODE_ENV === 'production' 
      ? 'https://fojourn.site' 
      : 'http://localhost:3000';
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'false'); // Must be false for anonymous CORS
    res.header('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

    // Get file info and set content type
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    const contentType = contentTypes[ext] || 'image/jpeg';
    res.header('Content-Type', contentType);

    // Send the file
    res.sendFile(filePath);
  } catch (error) {
    console.error('Avatar serve error:', error);
    res.status(500).json({ error: 'Failed to serve avatar' });
  }
});

// Verify token endpoint
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    // Get full user data including avatar info
    const [users] = await pool.execute(
      'SELECT id, username, email, first_name, last_name, avatar_path, avatar_filename, profile_bio, profile_public FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ valid: false, error: 'User not found' });
    }

    const user = users[0];
    res.json({ 
      valid: true, 
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        avatarPath: user.avatar_path,
        avatarFilename: user.avatar_filename
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ valid: false, error: 'Verification failed' });
  }
});

// Password Reset Request
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Check if user exists
    const [users] = await pool.execute(
      'SELECT id, username, email FROM users WHERE email = ?',
      [email]
    );

    // Always return success to prevent email enumeration
    if (users.length === 0) {
      return res.json({ 
        message: 'If an account with that email exists, we\'ve sent a password reset link.' 
      });
    }

    const user = users[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    // Store reset token in database
    await pool.execute(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, resetToken, expiresAt]
    );

    // Send reset email
    const emailSent = await emailService.sendPasswordResetEmail(
      user.email, 
      resetToken, 
      user.username
    );

    if (!emailSent) {
      console.error('Failed to send password reset email');
      // Still return success to user for security
    }

    res.json({ 
      message: 'If an account with that email exists, we\'ve sent a password reset link.' 
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Password Reset Verification
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    // Find valid reset token
    const [tokens] = await pool.execute(
      `SELECT prt.id, prt.user_id, u.username, u.email 
       FROM password_reset_tokens prt 
       JOIN users u ON prt.user_id = u.id 
       WHERE prt.token = ? AND prt.expires_at > NOW() AND prt.used = FALSE`,
      [token]
    );

    if (tokens.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const resetData = tokens[0];

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update user password
    await pool.execute(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [passwordHash, resetData.user_id]
    );

    // Mark token as used
    await pool.execute(
      'UPDATE password_reset_tokens SET used = TRUE WHERE id = ?',
      [resetData.id]
    );

    // Optionally, delete all reset tokens for this user
    await pool.execute(
      'DELETE FROM password_reset_tokens WHERE user_id = ?',
      [resetData.user_id]
    );

    res.json({ message: 'Password has been reset successfully' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify Reset Token
router.post('/verify-reset-token', [
  body('token').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token } = req.body;

    // Check if token is valid
    const [tokens] = await pool.execute(
      `SELECT prt.id, u.email 
       FROM password_reset_tokens prt 
       JOIN users u ON prt.user_id = u.id 
       WHERE prt.token = ? AND prt.expires_at > NOW() AND prt.used = FALSE`,
      [token]
    );

    if (tokens.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    res.json({ 
      valid: true, 
      email: tokens[0].email.replace(/(.{2}).*(@.*)/, '$1***$2') // Partially hide email
    });

  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
