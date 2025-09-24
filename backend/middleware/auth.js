const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user still exists and is active
    const [users] = await pool.execute(
      `SELECT 
         u.id, u.username, u.email, u.is_active, u.is_admin,
         umi.is_merged, umi.merge_slug, umi.partner_user_id
       FROM users u
       LEFT JOIN user_merge_info umi ON u.id = umi.user_id
       WHERE u.id = ? AND u.is_active = TRUE`,
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid token - user not found' });
    }

    req.user = users[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    // Check if user has admin role (user should already be authenticated)
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { authenticateToken, requireAdmin };
