const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const emailService = require('../utils/emailService');

const router = express.Router();

// Configure multer for avatar uploads (use memory storage for processing)
const avatarUpload = multer({
  storage: multer.memoryStorage(),
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

// Configure multer for hero image uploads (use memory storage for processing)
const heroImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for hero images
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
      'SELECT id, username, email, password_hash, first_name, last_name, avatar_path, avatar_filename, profile_bio, profile_public, is_admin FROM users WHERE (username = ? OR email = ?) AND is_active = TRUE',
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
      { 
        userId: user.id, 
        username: user.username, 
        email: user.email, 
        isAdmin: user.is_admin 
      },
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
        heroImageUrl: user.hero_image_url,
        heroImageFilename: user.hero_image_filename,
        profileBio: user.profile_bio,
        profilePublic: user.profile_public,
        publicUsername: user.public_username,
        isAdmin: user.is_admin
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
      'SELECT id, username, email, first_name, last_name, avatar_path, avatar_filename, hero_image_url, hero_image_filename, profile_bio, profile_public, public_username, is_admin, created_at FROM users WHERE id = ?',
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
        heroImageUrl: user.hero_image_url,
        heroImageFilename: user.hero_image_filename,
        profileBio: user.profile_bio,
        profilePublic: user.profile_public,
        publicUsername: user.public_username,
        isAdmin: user.is_admin,
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
  body('profilePublic').optional().isBoolean(),
  body('publicUsername').optional().custom((value) => {
    if (value === '' || value === null || value === undefined) {
      return true; // Allow empty values
    }
    if (value.length < 3 || value.length > 50) {
      throw new Error('Public username must be between 3 and 50 characters');
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(value)) {
      throw new Error('Public username can only contain letters, numbers, dots, underscores, and hyphens');
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, profileBio, profilePublic, publicUsername } = req.body;
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
    if (publicUsername !== undefined) {
      // Check if publicUsername is already taken (if not empty)
      if (publicUsername.trim() !== '') {
        const [existingUsers] = await pool.execute(
          'SELECT id FROM users WHERE public_username = ? AND id != ?',
          [publicUsername.trim(), req.user.id]
        );
        
        if (existingUsers.length > 0) {
          return res.status(409).json({ error: 'This public username is already taken. Please choose a different one.' });
        }
      }
      
      updates.push('public_username = ?');
      values.push(publicUsername.trim() || null);
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

    // Create uploads/avatars directory if it doesn't exist
    const uploadDir = path.join(__dirname, '../uploads/avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `avatar-${req.user.id}-${uniqueSuffix}.webp`;
    const filePath = path.join(uploadDir, filename);

    // Resize and optimize the image using Sharp
    await sharp(req.file.buffer)
      .resize(200, 200, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 85 })
      .toFile(filePath);

    const avatarPath = `/uploads/avatars/${filename}`;

    // Delete old avatar if exists
    const [currentUser] = await pool.execute(
      'SELECT avatar_path, avatar_filename FROM users WHERE id = ?',
      [req.user.id]
    );

    if (currentUser.length > 0 && currentUser[0].avatar_filename) {
      const oldAvatarPath = path.join(__dirname, '../uploads/avatars', currentUser[0].avatar_filename);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
      
      // Also remove from public avatars if it exists
      const oldPublicAvatarPath = path.join(__dirname, '../uploads/public/avatars', currentUser[0].avatar_filename);
      if (fs.existsSync(oldPublicAvatarPath)) {
        fs.unlinkSync(oldPublicAvatarPath);
      }
    }

    // Update user avatar in database
    await pool.execute(
      'UPDATE users SET avatar_path = ?, avatar_filename = ? WHERE id = ?',
      [avatarPath, filename, req.user.id]
    );

    // Copy to public avatars if profile is public
    const [user] = await pool.execute(
      'SELECT profile_public FROM users WHERE id = ?',
      [req.user.id]
    );

    if (user.length > 0 && user[0].profile_public) {
      const { copyAvatarToPublic } = require('../utils/publicUtils');
      await copyAvatarToPublic(req.user.id, filename);
    }

    res.json({ 
      message: 'Avatar uploaded and resized successfully',
      avatarPath: avatarPath,
      avatarFilename: filename
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Avatar upload failed' });
  }
});

// Upload hero image
router.post('/hero-image', authenticateToken, heroImageUpload.single('heroImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No hero image file provided' });
    }

    // Create uploads/hero-images directory if it doesn't exist
    const uploadDir = path.join(__dirname, '../uploads/hero-images');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Create public/hero-images directory for direct serving
    const publicDir = path.join(__dirname, '../public/hero-images');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(req.file.originalname).toLowerCase();
    const filename = `hero-${timestamp}-${randomString}${extension}`;

    // Process and save hero image (1200x400 for hero banner)
    const filePath = path.join(uploadDir, filename);
    const publicFilePath = path.join(publicDir, filename);

    await sharp(req.file.buffer)
      .resize(1200, 400, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 85 })
      .toFile(filePath);

    // Copy to public directory for direct serving
    await sharp(req.file.buffer)
      .resize(1200, 400, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 85 })
      .toFile(publicFilePath);

    const heroImageUrl = `/hero-images/${filename}`;

    // Delete old hero image if exists
    const [currentUser] = await pool.execute(
      'SELECT hero_image_filename FROM users WHERE id = ?',
      [req.user.id]
    );

    if (currentUser.length > 0 && currentUser[0].hero_image_filename) {
      const oldHeroImagePath = path.join(__dirname, '../uploads/hero-images', currentUser[0].hero_image_filename);
      const oldPublicHeroImagePath = path.join(__dirname, '../public/hero-images', currentUser[0].hero_image_filename);
      
      if (fs.existsSync(oldHeroImagePath)) {
        fs.unlinkSync(oldHeroImagePath);
      }
      if (fs.existsSync(oldPublicHeroImagePath)) {
        fs.unlinkSync(oldPublicHeroImagePath);
      }
    }

    // Update user hero image in database
    await pool.execute(
      'UPDATE users SET hero_image_url = ?, hero_image_filename = ? WHERE id = ?',
      [heroImageUrl, filename, req.user.id]
    );

    res.json({ 
      message: 'Hero image uploaded successfully',
      heroImageUrl: heroImageUrl,
      heroImageFilename: filename
    });
  } catch (error) {
    console.error('Hero image upload error:', error);
    res.status(500).json({ error: 'Hero image upload failed' });
  }
});

// Serve hero images publicly (no authentication required)
router.get('/hero-image/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../public/hero-images', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Hero image not found' });
    }

    // Set CORS headers for public access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours cache

    // Send the file
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error('Hero image serve error:', error);
    res.status(500).json({ error: 'Failed to serve hero image' });
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

// Get avatar file (with token authentication) - matches media.js pattern
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

    // Set headers exactly like media.js
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    
    // Add CORS and CORP headers - exact same pattern as media.js
    const allowedOrigin = process.env.NODE_ENV === 'production' 
      ? (process.env.FRONTEND_URL || 'https://fojourn.site')
      : 'http://localhost:3000';
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    // Send the file using resolve like media.js
    res.sendFile(path.resolve(filePath));
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
      'SELECT id, username, email, first_name, last_name, avatar_path, avatar_filename, hero_image_url, hero_image_filename, profile_bio, profile_public, public_username, is_admin FROM users WHERE id = ?',
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
        avatarFilename: user.avatar_filename,
        isAdmin: user.is_admin
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
