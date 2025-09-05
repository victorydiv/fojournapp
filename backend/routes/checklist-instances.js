const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get specific checklist instance with items
router.get('/:instanceId', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Get instance details
    const [instances] = await connection.execute(
      `SELECT ci.*, c.title as template_title, c.description as template_description
       FROM checklist_instances ci
       JOIN checklists c ON ci.template_id = c.id
       WHERE ci.id = ? AND ci.user_id = ?`,
      [req.params.instanceId, req.user.id]
    );
    
    if (instances.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Checklist instance not found' });
    }
    
    const instance = instances[0];
    
    // Get instance items
    const [items] = await connection.execute(
      `SELECT * FROM checklist_instance_items 
       WHERE instance_id = ? 
       ORDER BY sort_order ASC, created_at ASC`,
      [req.params.instanceId]
    );
    
    instance.items = items;
    
    connection.release();
    res.json(instance);
  } catch (error) {
    console.error('Error fetching checklist instance:', error);
    res.status(500).json({ error: 'Failed to fetch checklist instance' });
  }
});

// Update checklist instance
router.put('/:instanceId', [
  body('title').optional().isLength({ min: 1, max: 255 }).trim(),
  body('description').optional().trim(),
  body('category').optional().isIn(['general', 'packing', 'planning', 'activities', 'documents', 'food', 'other']),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i)
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, category, color } = req.body;
    const connection = await pool.getConnection();
    
    const updates = [];
    const values = [];
    
    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (category !== undefined) { updates.push('category = ?'); values.push(category); }
    if (color !== undefined) { updates.push('color = ?'); values.push(color); }
    
    if (updates.length === 0) {
      connection.release();
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    values.push(req.params.instanceId, req.user.id);
    
    const [result] = await connection.execute(
      `UPDATE checklist_instances SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );
    
    if (result.affectedRows === 0) {
      connection.release();
      return res.status(404).json({ error: 'Checklist instance not found' });
    }
    
    // Get updated instance
    const [instances] = await connection.execute(
      'SELECT * FROM checklist_instances WHERE id = ?',
      [req.params.instanceId]
    );
    
    connection.release();
    res.json(instances[0]);
  } catch (error) {
    console.error('Error updating checklist instance:', error);
    res.status(500).json({ error: 'Failed to update checklist instance' });
  }
});

// Delete checklist instance
router.delete('/:instanceId', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    const [result] = await connection.execute(
      'DELETE FROM checklist_instances WHERE id = ? AND user_id = ?',
      [req.params.instanceId, req.user.id]
    );
    
    connection.release();
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Checklist instance not found' });
    }
    
    res.json({ message: 'Checklist instance deleted successfully' });
  } catch (error) {
    console.error('Error deleting checklist instance:', error);
    res.status(500).json({ error: 'Failed to delete checklist instance' });
  }
});

// Add item to checklist instance
router.post('/:instanceId/items', [
  body('text').isLength({ min: 1, max: 500 }).trim(),
  body('description').optional().trim(),
  body('category').optional().trim(),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('due_date').optional().isISO8601(),
  body('sort_order').optional().isInt()
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { text, description, category, priority, due_date, sort_order } = req.body;
    const connection = await pool.getConnection();
    
    // Verify instance belongs to user
    const [instances] = await connection.execute(
      'SELECT id FROM checklist_instances WHERE id = ? AND user_id = ?',
      [req.params.instanceId, req.user.id]
    );
    
    if (instances.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Checklist instance not found' });
    }
    
    // Get next sort order if not provided
    let finalSortOrder = sort_order;
    if (finalSortOrder === undefined) {
      const [maxOrder] = await connection.execute(
        'SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM checklist_instance_items WHERE instance_id = ?',
        [req.params.instanceId]
      );
      finalSortOrder = maxOrder[0].next_order;
    }
    
    const [result] = await connection.execute(
      `INSERT INTO checklist_instance_items 
       (instance_id, text, description, category, priority, due_date, sort_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.params.instanceId,
        text,
        description || null,
        category || null,
        priority || 'medium',
        due_date || null,
        finalSortOrder
      ]
    );
    
    // Get the created item
    const [newItem] = await connection.execute(
      'SELECT * FROM checklist_instance_items WHERE id = ?',
      [result.insertId]
    );
    
    connection.release();
    res.status(201).json(newItem[0]);
  } catch (error) {
    console.error('Error adding item to checklist instance:', error);
    res.status(500).json({ error: 'Failed to add item to checklist instance' });
  }
});

// Update checklist instance item
router.put('/:instanceId/items/:itemId', [
  body('text').optional().isLength({ min: 1, max: 500 }).trim(),
  body('description').optional().trim(),
  body('is_completed').optional().isBoolean(),
  body('category').optional().trim(),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('due_date').optional().isISO8601(),
  body('sort_order').optional().isInt(),
  body('notes').optional().trim()
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const connection = await pool.getConnection();
    
    // Verify instance belongs to user
    const [instances] = await connection.execute(
      'SELECT id FROM checklist_instances WHERE id = ? AND user_id = ?',
      [req.params.instanceId, req.user.id]
    );
    
    if (instances.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Checklist instance not found' });
    }
    
    const { text, description, is_completed, category, priority, due_date, sort_order, notes } = req.body;
    
    const updates = [];
    const values = [];
    
    if (text !== undefined) { updates.push('text = ?'); values.push(text); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (is_completed !== undefined) { updates.push('is_completed = ?'); values.push(is_completed); }
    if (category !== undefined) { updates.push('category = ?'); values.push(category); }
    if (priority !== undefined) { updates.push('priority = ?'); values.push(priority); }
    if (due_date !== undefined) { updates.push('due_date = ?'); values.push(due_date); }
    if (sort_order !== undefined) { updates.push('sort_order = ?'); values.push(sort_order); }
    if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
    
    if (updates.length === 0) {
      connection.release();
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    values.push(req.params.itemId, req.params.instanceId);
    
    const [result] = await connection.execute(
      `UPDATE checklist_instance_items SET ${updates.join(', ')} 
       WHERE id = ? AND instance_id = ?`,
      values
    );
    
    if (result.affectedRows === 0) {
      connection.release();
      return res.status(404).json({ error: 'Checklist item not found' });
    }
    
    // Get updated item
    const [items] = await connection.execute(
      'SELECT * FROM checklist_instance_items WHERE id = ?',
      [req.params.itemId]
    );
    
    connection.release();
    res.json(items[0]);
  } catch (error) {
    console.error('Error updating checklist instance item:', error);
    res.status(500).json({ error: 'Failed to update checklist instance item' });
  }
});

// Delete checklist instance item
router.delete('/:instanceId/items/:itemId', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Verify instance belongs to user
    const [instances] = await connection.execute(
      'SELECT id FROM checklist_instances WHERE id = ? AND user_id = ?',
      [req.params.instanceId, req.user.id]
    );
    
    if (instances.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Checklist instance not found' });
    }
    
    const [result] = await connection.execute(
      'DELETE FROM checklist_instance_items WHERE id = ? AND instance_id = ?',
      [req.params.itemId, req.params.instanceId]
    );
    
    connection.release();
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }
    
    res.json({ message: 'Checklist item deleted successfully' });
  } catch (error) {
    console.error('Error deleting checklist instance item:', error);
    res.status(500).json({ error: 'Failed to delete checklist instance item' });
  }
});

// Bulk update items (for reordering)
router.put('/:instanceId/items/bulk', [
  body('items').isArray(),
  body('items.*.id').isInt(),
  body('items.*.sort_order').isInt()
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { items } = req.body;
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Verify instance belongs to user
      const [instances] = await connection.execute(
        'SELECT id FROM checklist_instances WHERE id = ? AND user_id = ?',
        [req.params.instanceId, req.user.id]
      );
      
      if (instances.length === 0) {
        throw new Error('Checklist instance not found');
      }
      
      // Update each item's sort order
      for (const item of items) {
        await connection.execute(
          'UPDATE checklist_instance_items SET sort_order = ? WHERE id = ? AND instance_id = ?',
          [item.sort_order, item.id, req.params.instanceId]
        );
      }
      
      await connection.commit();
      connection.release();
      
      res.json({ message: 'Items updated successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error bulk updating checklist items:', error);
    res.status(500).json({ error: 'Failed to update checklist items' });
  }
});

module.exports = router;
