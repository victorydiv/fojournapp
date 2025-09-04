const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get checklists attached to a dream
router.get('/:dreamId/checklists', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Verify dream access (user owns the dream)
    const [dreamAccess] = await connection.execute(
      'SELECT id, user_id FROM dreams WHERE id = ? AND user_id = ?',
      [req.params.dreamId, req.user.id]
    );
    
    if (dreamAccess.length === 0) {
      connection.release();
      return res.status(403).json({ error: 'Dream not found or access denied' });
    }
    
    // Get attached checklists
    const [checklists] = await connection.execute(
      `SELECT c.id, c.user_id, c.title, c.description, c.category, c.is_template, 
       c.is_public, c.color, c.created_at, c.updated_at, 
       dc.attached_at, u.username as attached_by_username,
       COUNT(ci.id) as total_items,
       COUNT(CASE WHEN ci.is_completed = 1 THEN 1 END) as completed_items
       FROM dream_checklists dc
       JOIN checklists c ON dc.checklist_id = c.id
       JOIN users u ON dc.attached_by = u.id
       LEFT JOIN checklist_items ci ON c.id = ci.checklist_id
       WHERE dc.dream_id = ?
       GROUP BY c.id, c.user_id, c.title, c.description, c.category, c.is_template, 
                c.is_public, c.color, c.created_at, c.updated_at, 
                dc.attached_at, u.username, dc.attached_by
       ORDER BY dc.attached_at DESC`,
      [req.params.dreamId]
    );
    
    connection.release();
    res.json(checklists);
  } catch (error) {
    console.error('Error fetching dream checklists:', error);
    res.status(500).json({ error: 'Failed to fetch dream checklists' });
  }
});

// Attach checklist to dream
router.post('/:dreamId/checklists', [
  body('checklist_id').isInt({ min: 1 })
], authenticateToken, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const connection = await pool.getConnection();
    
    // Verify dream access
    const [dreamAccess] = await connection.execute(
      'SELECT id, user_id FROM dreams WHERE id = ? AND user_id = ?',
      [req.params.dreamId, req.user.id]
    );
    
    if (dreamAccess.length === 0) {
      connection.release();
      return res.status(403).json({ error: 'Dream not found or access denied' });
    }
    
    // Verify checklist access (user owns it or it's public)
    const [checklistAccess] = await connection.execute(
      'SELECT id FROM checklists WHERE id = ? AND (user_id = ? OR is_public = 1)',
      [req.body.checklist_id, req.user.id]
    );
    
    if (checklistAccess.length === 0) {
      connection.release();
      return res.status(403).json({ error: 'Checklist not found or access denied' });
    }
    
    // Check if already attached
    const [existing] = await connection.execute(
      'SELECT id FROM dream_checklists WHERE dream_id = ? AND checklist_id = ?',
      [req.params.dreamId, req.body.checklist_id]
    );
    
    if (existing.length > 0) {
      connection.release();
      return res.status(409).json({ error: 'Checklist already attached to this dream' });
    }
    
    // Attach checklist
    await connection.execute(
      'INSERT INTO dream_checklists (dream_id, checklist_id, attached_by) VALUES (?, ?, ?)',
      [req.params.dreamId, req.body.checklist_id, req.user.id]
    );
    
    connection.release();
    res.status(201).json({ message: 'Checklist attached successfully' });
  } catch (error) {
    console.error('Error attaching checklist to dream:', error);
    res.status(500).json({ error: 'Failed to attach checklist' });
  }
});

// Detach checklist from dream
router.delete('/:dreamId/checklists/:checklistId', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Verify dream access
    const [dreamAccess] = await connection.execute(
      'SELECT id, user_id FROM dreams WHERE id = ? AND user_id = ?',
      [req.params.dreamId, req.user.id]
    );
    
    if (dreamAccess.length === 0) {
      connection.release();
      return res.status(403).json({ error: 'Dream not found or access denied' });
    }
    
    // Remove the association
    const [result] = await connection.execute(
      'DELETE FROM dream_checklists WHERE dream_id = ? AND checklist_id = ?',
      [req.params.dreamId, req.params.checklistId]
    );
    
    connection.release();
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Checklist not found on this dream' });
    }
    
    res.json({ message: 'Checklist detached successfully' });
  } catch (error) {
    console.error('Error detaching checklist from dream:', error);
    res.status(500).json({ error: 'Failed to detach checklist' });
  }
});

module.exports = router;
