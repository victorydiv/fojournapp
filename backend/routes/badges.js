const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { copyBadgeToPublic, removeBadgeFromPublic } = require('../utils/publicBadgeUtils');

const router = express.Router();

// Get all available badges
router.get('/available', authenticateToken, async (req, res) => {
  try {
    const [badges] = await pool.execute(`
      SELECT id, name, description, icon_url, badge_type, criteria_type, criteria_value, points
      FROM badges 
      WHERE is_active = TRUE
      ORDER BY badge_type, points ASC
    `);

    res.json({ badges });
  } catch (error) {
    console.error('Error fetching available badges:', error);
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

// Get user's earned badges
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user is requesting their own badges or is admin
    if (req.user.id !== parseInt(userId) && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [userBadges] = await pool.execute(`
      SELECT 
        ub.id as user_badge_id,
        ub.earned_at,
        ub.progress_data,
        b.id,
        b.name,
        b.description,
        b.icon_url,
        b.badge_type,
        b.criteria_type,
        b.criteria_value,
        b.points
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = ?
      ORDER BY ub.earned_at DESC
    `, [userId]);

    // Map the response to match frontend expectations
    const mappedBadges = userBadges.map(badge => ({
      ...badge,
      awarded_at: badge.earned_at, // Map earned_at to awarded_at for frontend compatibility
      type: badge.badge_type, // Map badge_type to type
      requirement_value: badge.criteria_value, // Map criteria_value to requirement_value
      icon: badge.icon_url // Add icon field for compatibility
    }));

    res.json({ badges: mappedBadges });
  } catch (error) {
    console.error('Error fetching user badges:', error);
    res.status(500).json({ error: 'Failed to fetch user badges' });
  }
});

// Get user's badge progress (for badges not yet earned)
router.get('/progress/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user is requesting their own progress or is admin
    if (req.user.id !== parseInt(userId) && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [progress] = await pool.execute(`
      SELECT 
        bp.badge_id,
        bp.current_count,
        bp.progress_data,
        bp.last_updated,
        b.name,
        b.description,
        b.icon_url,
        b.badge_type,
        b.criteria_type,
        b.criteria_value,
        b.points
      FROM badge_progress bp
      JOIN badges b ON bp.badge_id = b.id
      WHERE bp.user_id = ? 
        AND bp.badge_id NOT IN (
          SELECT badge_id FROM user_badges WHERE user_id = ?
        )
      ORDER BY b.badge_type, b.points ASC
    `, [userId, userId]);

    res.json({ progress });
  } catch (error) {
    console.error('Error fetching badge progress:', error);
    res.status(500).json({ error: 'Failed to fetch badge progress' });
  }
});

// Get user's badge statistics
router.get('/stats/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user is requesting their own stats or is admin
    if (req.user.id !== parseInt(userId) && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [stats] = await pool.execute(`
      SELECT 
        COUNT(ub.id) as total_badges,
        COALESCE(SUM(b.points), 0) as total_points,
        COUNT(CASE WHEN b.badge_type = 'achievement' THEN 1 END) as achievement_badges,
        COUNT(CASE WHEN b.badge_type = 'milestone' THEN 1 END) as milestone_badges,
        COUNT(CASE WHEN b.badge_type = 'social' THEN 1 END) as social_badges,
        COUNT(CASE WHEN b.badge_type = 'content' THEN 1 END) as content_badges
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = ?
    `, [userId]);

    const [totalAvailable] = await pool.execute(`
      SELECT COUNT(*) as total_available FROM badges WHERE is_active = TRUE
    `);

    res.json({ 
      stats: {
        ...stats[0],
        total_available: totalAvailable[0].total_available,
        completion_percentage: Math.round((stats[0].total_badges / totalAvailable[0].total_available) * 100)
      }
    });
  } catch (error) {
    console.error('Error fetching badge stats:', error);
    res.status(500).json({ error: 'Failed to fetch badge statistics' });
  }
});

// Award a badge to a user (internal function, could be called by admin or system)
router.post('/award', authenticateToken, async (req, res) => {
  try {
    const { userId, badgeId, progressData } = req.body;

    // Check if user is admin (only admins can manually award badges)
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Check if user already has this badge
    const [existing] = await pool.execute(`
      SELECT id FROM user_badges WHERE user_id = ? AND badge_id = ?
    `, [userId, badgeId]);

    if (existing.length > 0) {
      return res.status(400).json({ error: 'User already has this badge' });
    }

    // Award the badge
    await pool.execute(`
      INSERT INTO user_badges (user_id, badge_id, progress_data)
      VALUES (?, ?, ?)
    `, [userId, badgeId, progressData ? JSON.stringify(progressData) : null]);

    // Remove from progress tracking if it exists
    await pool.execute(`
      DELETE FROM badge_progress WHERE user_id = ? AND badge_id = ?
    `, [userId, badgeId]);

    res.json({ success: true, message: 'Badge awarded successfully' });
  } catch (error) {
    console.error('Error awarding badge:', error);
    res.status(500).json({ error: 'Failed to award badge' });
  }
});

// Update badge progress (internal function for system use)
router.post('/progress', authenticateToken, async (req, res) => {
  try {
    const { userId, badgeId, currentCount, progressData } = req.body;

    // This could be restricted to system calls or admin only
    // For now, allowing authenticated users to update their own progress
    if (req.user.id !== parseInt(userId) && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.execute(`
      INSERT INTO badge_progress (user_id, badge_id, current_count, progress_data)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        current_count = VALUES(current_count),
        progress_data = VALUES(progress_data),
        last_updated = CURRENT_TIMESTAMP
    `, [userId, badgeId, currentCount, progressData ? JSON.stringify(progressData) : null]);

    res.json({ success: true, message: 'Progress updated successfully' });
  } catch (error) {
    console.error('Error updating badge progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Configure multer for badge icon uploads
const badgeIconStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/badges');
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename for badge icon
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `badge-${uniqueSuffix}${extension}`);
  }
});

const badgeIconFilter = (req, file, cb) => {
  // Allow only image files for badge icons
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only image files are allowed for badge icons.'), false);
  }
};

const uploadBadgeIcon = multer({
  storage: badgeIconStorage,
  fileFilter: badgeIconFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // Default 10MB if not set
  }
});

// Upload badge icon endpoint
router.post('/admin/upload-icon', authenticateToken, (req, res) => {
  console.log('Badge upload request received from user:', req.user?.id);
  console.log('User is admin:', req.user?.is_admin);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Request body keys:', Object.keys(req.body || {}));
  console.log('Request files:', req.files);
  
  // Check if user is admin
  if (!req.user.is_admin) {
    console.log('Admin access denied');
    return res.status(403).json({ error: 'Admin access required' });
  }

  console.log('Processing upload...');
  uploadBadgeIcon.single('icon')(req, res, async (err) => {
    console.log('Upload callback - Error:', err);
    console.log('Upload callback - File:', req.file);
    
    if (err) {
      console.log('Upload error occurred:', err.message);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const maxSizeMB = Math.round(parseInt(process.env.MAX_FILE_SIZE || '10485760') / 1024 / 1024);
          return res.status(400).json({ error: `File too large. Maximum size is ${maxSizeMB}MB.` });
        }
      }
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      console.log('No file received');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Upload successful - filename:', req.file.filename);
    
    // Copy to public directory for unauthenticated access
    try {
      await copyBadgeToPublic(req.file.filename);
    } catch (error) {
      console.error('Failed to copy badge to public directory:', error);
      // Don't fail the upload if public copy fails
    }
    
    // Return the relative path that will be stored in the database
    const iconPath = `/badges/${req.file.filename}`;
    res.json({ 
      success: true, 
      iconPath: iconPath,
      filename: req.file.filename,
      message: 'Badge icon uploaded successfully' 
    });
  });
});

// Admin-only routes for badge management
router.post('/admin/create', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, description, badge_type, criteria_type, criteria_value, icon_name, logic_json } = req.body;
    
    console.log('Creating badge with icon_name:', icon_name);
    
    // Validate logic_json if provided
    let parsedLogicJson = null;
    if (logic_json && logic_json.trim()) {
      try {
        parsedLogicJson = JSON.parse(logic_json);
      } catch (error) {
        return res.status(400).json({ error: 'Invalid JSON format in logic_json field' });
      }
    }
    
    // Use logic_json as criteria_value if provided, otherwise use the simple criteria_value
    const finalCriteriaValue = logic_json && logic_json.trim() ? logic_json : criteria_value;
    
    const [result] = await pool.execute(
      `INSERT INTO badges (name, description, badge_type, criteria_type, criteria_value, icon_url) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, description, badge_type, criteria_type, finalCriteriaValue, icon_name]
    );
    
    console.log('Badge created with ID:', result.insertId, 'and icon_url:', icon_name);
    
    res.json({ 
      success: true, 
      message: 'Badge created successfully',
      badgeId: result.insertId
    });
  } catch (error) {
    console.error('Create badge error:', error);
    res.status(500).json({ error: 'Failed to create badge' });
  }
});

router.put('/admin/:badgeId', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { badgeId } = req.params;
    const { name, description, badge_type, criteria_type, criteria_value, icon_name, logic_json } = req.body;
    
    console.log('Updating badge', badgeId, 'with icon_name:', icon_name);
    
    // Validate logic_json if provided
    let parsedLogicJson = null;
    if (logic_json && logic_json.trim()) {
      try {
        parsedLogicJson = JSON.parse(logic_json);
      } catch (error) {
        return res.status(400).json({ error: 'Invalid JSON format in logic_json field' });
      }
    }
    
    // Use logic_json as criteria_value if provided, otherwise use the simple criteria_value
    const finalCriteriaValue = logic_json && logic_json.trim() ? logic_json : criteria_value;
    
    await pool.execute(
      `UPDATE badges SET name = ?, description = ?, badge_type = ?, criteria_type = ?, 
       criteria_value = ?, icon_url = ? WHERE id = ?`,
      [name, description, badge_type, criteria_type, finalCriteriaValue, icon_name, badgeId]
    );
    
    console.log('Badge updated with icon_url:', icon_name);
    
    // Copy new icon to public directory if it exists
    if (icon_name && icon_name.includes('/badges/')) {
      try {
        const filename = icon_name.split('/').pop();
        await copyBadgeToPublic(filename);
      } catch (error) {
        console.error('Failed to copy updated badge to public directory:', error);
        // Don't fail the update if public copy fails
      }
    }
    
    res.json({ success: true, message: 'Badge updated successfully' });
  } catch (error) {
    console.error('Update badge error:', error);
    res.status(500).json({ error: 'Failed to update badge' });
  }
});

router.delete('/admin/:badgeId', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { badgeId } = req.params;
    
    // First delete user badge records
    await pool.execute('DELETE FROM user_badges WHERE badge_id = ?', [badgeId]);
    
    // Then delete badge progress records
    await pool.execute('DELETE FROM badge_progress WHERE badge_id = ?', [badgeId]);
    
    // Finally delete the badge itself
    await pool.execute('DELETE FROM badges WHERE id = ?', [badgeId]);
    
    res.json({ success: true, message: 'Badge deleted successfully' });
  } catch (error) {
    console.error('Delete badge error:', error);
    res.status(500).json({ error: 'Failed to delete badge' });
  }
});

// Get badge icon (authenticated like media files)
router.get('/icon/:filename', authenticateToken, async (req, res) => {
  // Set cache control headers to prevent caching
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  try {
    const filename = req.params.filename;
    const iconPath = path.join(__dirname, '..', 'uploads', 'badges', filename);
    
    // Check if file exists
    if (fsSync.existsSync(iconPath)) {
      // Set proper content type based on file extension
      const ext = path.extname(filename).toLowerCase();
      if (ext === '.png') {
        res.setHeader('Content-Type', 'image/png');
      } else if (ext === '.jpg' || ext === '.jpeg') {
        res.setHeader('Content-Type', 'image/jpeg');
      } else if (ext === '.gif') {
        res.setHeader('Content-Type', 'image/gif');
      } else if (ext === '.svg') {
        res.setHeader('Content-Type', 'image/svg+xml');
      }
      res.sendFile(iconPath);
    } else {
      console.log('Badge icon not found:', filename);
      res.status(404).json({ error: 'Badge icon not found' });
    }
  } catch (error) {
    console.error('Error serving badge icon:', error);
    res.status(500).json({ error: 'Failed to serve badge icon' });
  }
});

module.exports = router;
