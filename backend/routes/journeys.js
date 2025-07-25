const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all journeys for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('User from auth:', req.user);
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM journeys WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching journeys:', error);
    res.status(500).json({ error: 'Failed to fetch journeys' });
  }
});

// Create a new journey
router.post('/', [
  body('title').isLength({ min: 1, max: 255 }).trim(),
  body('description').optional().trim(),
  body('destination').optional().isLength({ max: 255 }).trim(),
  body('start_date').isISO8601(),
  body('end_date').isISO8601()
], authenticateToken, async (req, res) => {
  try {
    console.log('Received journey data:', req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, start_date, end_date, destination } = req.body;
    const connection = await pool.getConnection();
    
    // Use title as destination if not provided
    const journeyDestination = destination || title || 'Unknown Destination';
    
    console.log('Inserting journey with:', {
      userId: req.user.id,
      title,
      description: description || '',
      destination: journeyDestination,
      start_date,
      end_date
    });
    
    const [result] = await connection.execute(
      'INSERT INTO journeys (user_id, title, description, destination, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, title, description || '', journeyDestination, start_date, end_date]
    );
    
    connection.release();
    res.status(201).json({ 
      id: result.insertId, 
      title,
      description: description || '',
      destination: journeyDestination,
      start_date,
      end_date,
      message: 'Journey created successfully' 
    });
  } catch (error) {
    console.error('Error creating journey:', error);
    res.status(500).json({ error: 'Failed to create journey' });
  }
});

// Get a specific journey
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM journeys WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    
    if (rows.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Journey not found' });
    }
    
    connection.release();
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching journey:', error);
    res.status(500).json({ error: 'Failed to fetch journey' });
  }
});

// Update a journey
router.put('/:id', [
  body('title').optional().isLength({ min: 1, max: 255 }).trim(),
  body('description').optional().trim(),
  body('destination').optional().isLength({ max: 255 }).trim(),
  body('start_date').optional().isISO8601(),
  body('end_date').optional().isISO8601()
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, destination, start_date, end_date, route_data } = req.body;
    const connection = await pool.getConnection();
    
    const [result] = await connection.execute(
      'UPDATE journeys SET title = COALESCE(?, title), description = COALESCE(?, description), destination = COALESCE(?, destination), start_date = COALESCE(?, start_date), end_date = COALESCE(?, end_date), planning_data = COALESCE(?, planning_data) WHERE id = ? AND user_id = ?',
      [title, description, destination, start_date, end_date, JSON.stringify(route_data), req.params.id, req.user.id]
    );
    
    if (result.affectedRows === 0) {
      connection.release();
      return res.status(404).json({ error: 'Journey not found' });
    }
    
    connection.release();
    res.json({ message: 'Journey updated successfully' });
  } catch (error) {
    console.error('Error updating journey:', error);
    res.status(500).json({ error: 'Failed to update journey' });
  }
});

// Delete a journey
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    const [result] = await connection.execute(
      'DELETE FROM journeys WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    
    if (result.affectedRows === 0) {
      connection.release();
      return res.status(404).json({ error: 'Journey not found' });
    }
    
    connection.release();
    res.json({ message: 'Journey deleted successfully' });
  } catch (error) {
    console.error('Error deleting journey:', error);
    res.status(500).json({ error: 'Failed to delete journey' });
  }
});

module.exports = router;
