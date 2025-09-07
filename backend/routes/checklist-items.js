const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get items for a checklist
router.get('/:checklistId/items', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Verify access to checklist
    const [checklist] = await connection.execute(
      `SELECT * FROM checklists WHERE id = ? AND (user_id = ? OR is_public = 1)`,
      [req.params.checklistId, req.user.id]
    );
    
    if (checklist.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Checklist not found' });
    }
    
    const [items] = await connection.execute(
      'SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY sort_order ASC, created_at ASC',
      [req.params.checklistId]
    );
    
    // Convert boolean fields from MySQL integers to JavaScript booleans
    const formattedItems = items.map(item => ({
      ...item,
      is_completed: Boolean(item.is_completed)
    }));
    
    connection.release();
    res.json(formattedItems);
  } catch (error) {
    console.error('Error fetching checklist items:', error);
    res.status(500).json({ error: 'Failed to fetch checklist items' });
  }
});

// Add item to checklist
router.post('/:checklistId/items', [
  body('text').isLength({ min: 1, max: 500 }).trim(),
  body('description').optional().trim(),
  body('category').optional().isLength({ max: 100 }).trim(),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('due_date').optional().isISO8601(),
  body('notes').optional().trim()
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { text, description, category, priority, due_date, notes } = req.body;
    const connection = await pool.getConnection();
    
    // Verify checklist ownership
    const [checklist] = await connection.execute(
      'SELECT * FROM checklists WHERE id = ? AND user_id = ?',
      [req.params.checklistId, req.user.id]
    );
    
    if (checklist.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Checklist not found' });
    }
    
    // Get next sort order
    const [maxOrder] = await connection.execute(
      'SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM checklist_items WHERE checklist_id = ?',
      [req.params.checklistId]
    );
    
    const sortOrder = maxOrder[0].next_order;
    
    const [result] = await connection.execute(
      `INSERT INTO checklist_items (checklist_id, text, description, category, priority, due_date, notes, sort_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.params.checklistId,
        text,
        description || null,
        category || null,
        priority || 'medium',
        due_date || null,
        notes || null,
        sortOrder
      ]
    );
    
    // Get the created item
    const [newItem] = await connection.execute(
      'SELECT * FROM checklist_items WHERE id = ?',
      [result.insertId]
    );
    
    // Convert boolean fields from MySQL integers to JavaScript booleans
    const formattedItem = {
      ...newItem[0],
      is_completed: Boolean(newItem[0].is_completed)
    };
    
    connection.release();
    res.status(201).json(formattedItem);
  } catch (error) {
    console.error('Error creating checklist item:', error);
    res.status(500).json({ error: 'Failed to create checklist item' });
  }
});

// Update checklist item
router.put('/:checklistId/items/:itemId', [
  body('text').optional().isLength({ min: 1, max: 500 }).trim(),
  body('description').optional().trim(),
  body('is_completed').optional().isBoolean(),
  body('category').optional().isLength({ max: 100 }).trim(),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('due_date').optional().isISO8601(),
  body('notes').optional().trim()
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { text, description, is_completed, category, priority, due_date, notes } = req.body;
    const connection = await pool.getConnection();
    
    // Verify checklist ownership
    const [checklist] = await connection.execute(
      'SELECT * FROM checklists WHERE id = ? AND user_id = ?',
      [req.params.checklistId, req.user.id]
    );
    
    if (checklist.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Checklist not found' });
    }
    
    const updates = [];
    const values = [];
    
    if (text !== undefined) { updates.push('text = ?'); values.push(text); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (is_completed !== undefined) { updates.push('is_completed = ?'); values.push(is_completed); }
    if (category !== undefined) { updates.push('category = ?'); values.push(category); }
    if (priority !== undefined) { updates.push('priority = ?'); values.push(priority); }
    if (due_date !== undefined) { updates.push('due_date = ?'); values.push(due_date); }
    if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
    
    if (updates.length === 0) {
      connection.release();
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    values.push(req.params.itemId, req.params.checklistId);
    
    const [result] = await connection.execute(
      `UPDATE checklist_items SET ${updates.join(', ')} 
       WHERE id = ? AND checklist_id = ?`,
      values
    );
    
    if (result.affectedRows === 0) {
      connection.release();
      return res.status(404).json({ error: 'Checklist item not found' });
    }
    
    // Get updated item
    const [updatedItem] = await connection.execute(
      'SELECT * FROM checklist_items WHERE id = ?',
      [req.params.itemId]
    );
    
    // Convert boolean fields from MySQL integers to JavaScript booleans
    const formattedItem = {
      ...updatedItem[0],
      is_completed: Boolean(updatedItem[0].is_completed)
    };
    
    connection.release();
    res.json(formattedItem);
  } catch (error) {
    console.error('Error updating checklist item:', error);
    res.status(500).json({ error: 'Failed to update checklist item' });
  }
});

// Delete checklist item
router.delete('/:checklistId/items/:itemId', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Verify checklist ownership
    const [checklist] = await connection.execute(
      'SELECT * FROM checklists WHERE id = ? AND user_id = ?',
      [req.params.checklistId, req.user.id]
    );
    
    if (checklist.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Checklist not found' });
    }
    
    const [result] = await connection.execute(
      'DELETE FROM checklist_items WHERE id = ? AND checklist_id = ?',
      [req.params.itemId, req.params.checklistId]
    );
    
    if (result.affectedRows === 0) {
      connection.release();
      return res.status(404).json({ error: 'Checklist item not found' });
    }
    
    connection.release();
    res.json({ message: 'Checklist item deleted successfully' });
  } catch (error) {
    console.error('Error deleting checklist item:', error);
    res.status(500).json({ error: 'Failed to delete checklist item' });
  }
});

// Reorder checklist items
router.put('/:checklistId/items/reorder', [
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
    
    // Verify checklist ownership
    const [checklist] = await connection.execute(
      'SELECT * FROM checklists WHERE id = ? AND user_id = ?',
      [req.params.checklistId, req.user.id]
    );
    
    if (checklist.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Checklist not found' });
    }
    
    // Begin transaction
    await connection.beginTransaction();
    
    try {
      // Update sort orders
      for (const item of items) {
        await connection.execute(
          'UPDATE checklist_items SET sort_order = ? WHERE id = ? AND checklist_id = ?',
          [item.sort_order, item.id, req.params.checklistId]
        );
      }
      
      await connection.commit();
      connection.release();
      res.json({ message: 'Items reordered successfully' });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Error reordering checklist items:', error);
    res.status(500).json({ error: 'Failed to reorder checklist items' });
  }
});

// Bulk update item completion status
router.put('/:checklistId/items/bulk-complete', [
  body('itemIds').isArray(),
  body('itemIds.*').isInt(),
  body('is_completed').isBoolean()
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { itemIds, is_completed } = req.body;
    const connection = await pool.getConnection();
    
    // Verify checklist ownership
    const [checklist] = await connection.execute(
      'SELECT * FROM checklists WHERE id = ? AND user_id = ?',
      [req.params.checklistId, req.user.id]
    );
    
    if (checklist.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Checklist not found' });
    }
    
    // Update completion status for all specified items
    const placeholders = itemIds.map(() => '?').join(',');
    const [result] = await connection.execute(
      `UPDATE checklist_items SET is_completed = ? 
       WHERE checklist_id = ? AND id IN (${placeholders})`,
      [is_completed, req.params.checklistId, ...itemIds]
    );
    
    connection.release();
    res.json({ 
      message: `${result.affectedRows} items updated successfully`,
      updated_count: result.affectedRows
    });
  } catch (error) {
    console.error('Error bulk updating checklist items:', error);
    res.status(500).json({ error: 'Failed to bulk update checklist items' });
  }
});

module.exports = router;
