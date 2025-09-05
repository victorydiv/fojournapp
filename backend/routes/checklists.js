const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const crypto = require('crypto');

console.log('🔧 Checklist routes loaded');

const router = express.Router();

// Debug middleware to log all requests to this router
router.use((req, res, next) => {
  console.log('🔧 Checklist route request:', req.method, req.originalUrl, req.params);
  next();
});

// Get all checklists for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category } = req.query;
    const connection = await pool.getConnection();
    
    let query = `SELECT c.*, 
       COUNT(ci.id) as total_items,
       COUNT(CASE WHEN ci.is_completed = 1 THEN 1 END) as completed_items
       FROM checklists c
       LEFT JOIN checklist_items ci ON c.id = ci.checklist_id
       WHERE c.user_id = ?`;
    
    const params = [req.user.id];
    
    if (category && category !== 'all') {
      query += ' AND c.category = ?';
      params.push(category);
    }
    
    query += ' GROUP BY c.id ORDER BY c.updated_at DESC';
    
    const [checklists] = await connection.execute(query, params);
    
    connection.release();
    res.json(checklists);
  } catch (error) {
    console.error('Error fetching checklists:', error);
    res.status(500).json({ error: 'Failed to fetch checklists' });
  }
});

// Get public/template checklists
router.get('/public', async (req, res) => {
  try {
    const { category, search } = req.query;
    const connection = await pool.getConnection();
    
    let query = `
      SELECT c.*, u.username as created_by_username,
      COUNT(ci.id) as total_items,
      COUNT(CASE WHEN ci.is_completed = 1 THEN 1 END) as completed_items
      FROM checklists c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN checklist_items ci ON c.id = ci.checklist_id
      WHERE c.is_public = 1
    `;
    
    const params = [];
    
    if (category) {
      query += ' AND c.category = ?';
      params.push(category);
    }
    
    if (search) {
      query += ' AND (c.title LIKE ? OR c.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' GROUP BY c.id ORDER BY c.created_at DESC LIMIT 50';
    
    const [checklists] = await connection.execute(query, params);
    
    connection.release();
    res.json(checklists);
  } catch (error) {
    console.error('Error fetching public checklists:', error);
    res.status(500).json({ error: 'Failed to fetch public checklists' });
  }
});

// Get a specific checklist with items
router.get('/:id', authenticateToken, async (req, res) => {
  console.log('🔧 GET /:id route hit with ID:', req.params.id);
  console.log('🔧 req.user:', req.user);
  console.log('🔧 Authorization header:', req.headers.authorization);
  try {
    const connection = await pool.getConnection();
    
    // Get checklist details
    const [checklists] = await connection.execute(
      `SELECT c.*, u.username as created_by_username
       FROM checklists c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ? AND (c.user_id = ? OR c.is_public = 1)`,
      [req.params.id, req.user?.id || 0]
    );
    
    if (checklists.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Checklist not found' });
    }
    
    const checklist = checklists[0];
    
    // Get checklist items
    const [items] = await connection.execute(
      `SELECT * FROM checklist_items 
       WHERE checklist_id = ? 
       ORDER BY sort_order ASC, created_at ASC`,
      [req.params.id]
    );
    
    checklist.items = items;
    
    connection.release();
    res.json(checklist);
  } catch (error) {
    console.error('Error fetching checklist:', error);
    res.status(500).json({ error: 'Failed to fetch checklist' });
  }
});

// Create a new checklist
router.post('/', [
  body('title').isLength({ min: 1, max: 255 }).trim(),
  body('description').optional().trim(),
  body('category').optional().isIn(['general', 'packing', 'planning', 'activities', 'documents', 'food', 'other']),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i),
  body('is_template').optional().isBoolean(),
  body('is_public').optional().isBoolean()
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, category, color, is_template, is_public } = req.body;
    const connection = await pool.getConnection();
    
    const [result] = await connection.execute(
      `INSERT INTO checklists (user_id, title, description, category, color, is_template, is_public) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id, 
        title, 
        description || null, 
        category || 'general', 
        color || '#1976d2', 
        is_template || false, 
        is_public || false
      ]
    );
    
    // Get the created checklist
    const [newChecklist] = await connection.execute(
      'SELECT * FROM checklists WHERE id = ?',
      [result.insertId]
    );
    
    connection.release();
    res.status(201).json({ ...newChecklist[0], items: [] });
  } catch (error) {
    console.error('Error creating checklist:', error);
    res.status(500).json({ error: 'Failed to create checklist' });
  }
});

// Update a checklist
router.put('/:id', [
  body('title').optional().isLength({ min: 1, max: 255 }).trim(),
  body('description').optional().trim(),
  body('category').optional().isIn(['general', 'packing', 'planning', 'activities', 'documents', 'food', 'other']),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i),
  body('is_template').optional().isBoolean(),
  body('is_public').optional().isBoolean()
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, category, color, is_template, is_public } = req.body;
    const connection = await pool.getConnection();
    
    const updates = [];
    const values = [];
    
    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (category !== undefined) { updates.push('category = ?'); values.push(category); }
    if (color !== undefined) { updates.push('color = ?'); values.push(color); }
    if (is_template !== undefined) { updates.push('is_template = ?'); values.push(is_template); }
    if (is_public !== undefined) { updates.push('is_public = ?'); values.push(is_public); }
    
    if (updates.length === 0) {
      connection.release();
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    values.push(req.params.id, req.user.id);
    
    const [result] = await connection.execute(
      `UPDATE checklists SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );
    
    if (result.affectedRows === 0) {
      connection.release();
      return res.status(404).json({ error: 'Checklist not found' });
    }
    
    connection.release();
    res.json({ message: 'Checklist updated successfully' });
  } catch (error) {
    console.error('Error updating checklist:', error);
    res.status(500).json({ error: 'Failed to update checklist' });
  }
});

// Delete a checklist
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    const [result] = await connection.execute(
      'DELETE FROM checklists WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    
    if (result.affectedRows === 0) {
      connection.release();
      return res.status(404).json({ error: 'Checklist not found' });
    }
    
    connection.release();
    res.json({ message: 'Checklist deleted successfully' });
  } catch (error) {
    console.error('Error deleting checklist:', error);
    res.status(500).json({ error: 'Failed to delete checklist' });
  }
});

// Duplicate a checklist (create from template)
router.post('/:id/duplicate', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Get original checklist
    const [originalChecklist] = await connection.execute(
      `SELECT * FROM checklists WHERE id = ? AND (user_id = ? OR is_public = 1)`,
      [req.params.id, req.user.id]
    );
    
    if (originalChecklist.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Checklist not found' });
    }
    
    const original = originalChecklist[0];
    
    // Create new checklist
    const [newChecklistResult] = await connection.execute(
      `INSERT INTO checklists (user_id, title, description, category, color, is_template, is_public) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        `${original.title} (Copy)`,
        original.description,
        original.category,
        original.color,
        false, // Copies are not templates by default
        false  // Copies are private by default
      ]
    );
    
    const newChecklistId = newChecklistResult.insertId;
    
    // Copy items
    const [originalItems] = await connection.execute(
      'SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY sort_order ASC',
      [req.params.id]
    );
    
    for (const item of originalItems) {
      await connection.execute(
        `INSERT INTO checklist_items (checklist_id, text, description, sort_order, category, priority, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          newChecklistId,
          item.text,
          item.description,
          item.sort_order,
          item.category,
          item.priority,
          item.notes
        ]
      );
    }
    
    // Get the new checklist with items
    const [newChecklist] = await connection.execute(
      'SELECT * FROM checklists WHERE id = ?',
      [newChecklistId]
    );
    
    const [newItems] = await connection.execute(
      'SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY sort_order ASC',
      [newChecklistId]
    );
    
    connection.release();
    res.status(201).json({ ...newChecklist[0], items: newItems });
  } catch (error) {
    console.error('Error duplicating checklist:', error);
    res.status(500).json({ error: 'Failed to duplicate checklist' });
  }
});

// Generate share token for a checklist
router.post('/:id/share', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Verify ownership
    const [checklist] = await connection.execute(
      'SELECT * FROM checklists WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    
    if (checklist.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Checklist not found' });
    }
    
    // Generate share token
    const shareToken = crypto.randomBytes(32).toString('hex');
    
    // Check if share already exists
    const [existingShare] = await connection.execute(
      'SELECT * FROM checklist_shares WHERE checklist_id = ?',
      [req.params.id]
    );
    
    if (existingShare.length > 0) {
      // Update existing share
      await connection.execute(
        'UPDATE checklist_shares SET share_token = ?, is_active = 1 WHERE checklist_id = ?',
        [shareToken, req.params.id]
      );
    } else {
      // Create new share
      await connection.execute(
        'INSERT INTO checklist_shares (checklist_id, share_token) VALUES (?, ?)',
        [req.params.id, shareToken]
      );
    }
    
    connection.release();
    res.json({ shareToken, shareUrl: `/checklists/shared/${shareToken}` });
  } catch (error) {
    console.error('Error creating share link:', error);
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

// Get shared checklist by token
router.get('/shared/:token', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Get checklist by share token
    const [shares] = await connection.execute(
      `SELECT cs.*, c.*, u.username as created_by_username
       FROM checklist_shares cs
       JOIN checklists c ON cs.checklist_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE cs.share_token = ? AND cs.is_active = 1`,
      [req.params.token]
    );
    
    if (shares.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Shared checklist not found' });
    }
    
    const checklist = shares[0];
    
    // Increment view count
    await connection.execute(
      'UPDATE checklist_shares SET view_count = view_count + 1 WHERE share_token = ?',
      [req.params.token]
    );
    
    // Get checklist items
    const [items] = await connection.execute(
      'SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY sort_order ASC',
      [checklist.checklist_id]
    );
    
    checklist.items = items;
    
    connection.release();
    res.json(checklist);
  } catch (error) {
    console.error('Error fetching shared checklist:', error);
    res.status(500).json({ error: 'Failed to fetch shared checklist' });
  }
});

module.exports = router;
