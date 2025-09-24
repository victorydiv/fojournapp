const express = require('express');
const { pool } = require('../config/database');

const router = express.Router();

// Get active memory types for public use (forms, dropdowns, etc.)
router.get('/', async (req, res) => {
  try {
    const [memoryTypes] = await pool.execute(`
      SELECT id, name, display_name, description, icon, color, is_active, sort_order
      FROM memory_types 
      WHERE is_active = TRUE
      ORDER BY sort_order ASC, display_name ASC
    `);

    res.json({
      success: true,
      memoryTypes
    });
  } catch (error) {
    console.error('Error fetching memory types:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch memory types' 
    });
  }
});

module.exports = router;