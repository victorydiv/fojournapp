const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const router = express.Router();

// Debug endpoint to check authentication
router.get('/debug-auth', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.json({ 
        error: 'No token provided',
        headers: req.headers.authorization 
      });
    }

    // Decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check what's in the database for this user
    const [entries] = await pool.execute(
      'SELECT COUNT(*) as count FROM travel_entries WHERE user_id = ?', 
      [decoded.userId]
    );
    
    const [dreams] = await pool.execute(
      'SELECT COUNT(*) as count FROM dreams WHERE user_id = ?', 
      [decoded.userId]
    );

    const [userInfo] = await pool.execute(
      'SELECT id, username, email FROM users WHERE id = ?', 
      [decoded.userId]
    );

    res.json({
      success: true,
      token_user_id: decoded.userId,
      token_username: decoded.username,
      token_email: decoded.email,
      database_user: userInfo[0] || 'USER NOT FOUND',
      entries_count: entries[0].count,
      dreams_count: dreams[0].count,
      token_payload: decoded
    });

  } catch (error) {
    res.json({ 
      error: error.message,
      token_provided: !!req.headers.authorization 
    });
  }
});

module.exports = router;
