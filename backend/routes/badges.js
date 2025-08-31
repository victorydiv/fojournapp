const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

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

    res.json({ badges: userBadges });
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

module.exports = router;
