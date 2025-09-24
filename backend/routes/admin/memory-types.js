const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../../config/database');
const { authenticateToken } = require('../../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    // Check if user has admin role
    const [users] = await pool.execute(
      'SELECT is_admin FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!users.length || !users[0].is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all memory types (for admin management)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const [memoryTypes] = await pool.execute(`
      SELECT id, name, display_name, description, icon, color, 
             is_active, sort_order, created_at, updated_at
      FROM memory_types 
      ORDER BY sort_order, id
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

// Create new memory type
router.post('/', [
  requireAdmin,
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Name must be 1-50 characters')
    .matches(/^[a-z0-9_]+$/)
    .withMessage('Name can only contain lowercase letters, numbers, and underscores'),
  body('display_name')
    .notEmpty()
    .withMessage('Display name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be 1-100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be 500 characters or less'),
  body('icon')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Icon must be 50 characters or less'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex color code'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  body('sort_order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { 
      name, 
      display_name, 
      description, 
      icon, 
      color, 
      is_active = true, 
      sort_order 
    } = req.body;

    // Check if memory type name already exists
    const [existing] = await pool.execute(
      'SELECT id FROM memory_types WHERE name = ?',
      [name]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Memory type with this name already exists'
      });
    }

    // Get next sort order if not provided
    let finalSortOrder = sort_order;
    if (finalSortOrder === undefined) {
      const [maxSort] = await pool.execute(
        'SELECT COALESCE(MAX(sort_order), 0) + 1 as nextSort FROM memory_types'
      );
      finalSortOrder = maxSort[0].nextSort;
    }

    // Insert new memory type
    const [result] = await pool.execute(`
      INSERT INTO memory_types (name, display_name, description, icon, color, is_active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [name, display_name, description || null, icon || null, color || null, is_active, finalSortOrder]);

    // Fetch the created memory type
    const [newMemoryType] = await pool.execute(`
      SELECT id, name, display_name, description, icon, color,
             is_active, sort_order, created_at, updated_at
      FROM memory_types WHERE id = ?
    `, [result.insertId]);

    res.status(201).json({
      success: true,
      memoryType: newMemoryType[0]
    });
  } catch (error) {
    console.error('Error creating memory type:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create memory type' 
    });
  }
});

// Reorder memory types
router.put('/reorder', [
  requireAdmin,
  body('memoryTypes')
    .isArray()
    .withMessage('memoryTypes must be an array'),
  body('memoryTypes.*.id')
    .isInt({ min: 1 })
    .withMessage('Each memory type must have a valid id'),
  body('memoryTypes.*.sortOrder')
    .isInt({ min: 0 })
    .withMessage('Each memory type must have a valid sort order'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { memoryTypes } = req.body;

    // Update sort orders in a transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      for (const memoryType of memoryTypes) {
        await connection.execute(
          'UPDATE memory_types SET sort_order = ? WHERE id = ?',
          [memoryType.sortOrder, memoryType.id]
        );
      }
      
      await connection.commit();
      res.json({
        success: true,
        message: 'Memory types reordered successfully'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error reordering memory types:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reorder memory types' 
    });
  }
});

// Update memory type
router.put('/:id', [
  requireAdmin,
  body('name')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Name must be 1-50 characters')
    .matches(/^[a-z0-9_]+$/)
    .withMessage('Name can only contain lowercase letters, numbers, and underscores'),
  body('display_name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be 1-100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be 500 characters or less'),
  body('icon')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Icon must be 50 characters or less'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex color code'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  body('sort_order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const updates = req.body;

    // Check if memory type exists
    const [existing] = await pool.execute(
      'SELECT * FROM memory_types WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Memory type not found'
      });
    }

    // If updating name, check if new name already exists
    if (updates.name && updates.name !== existing[0].name) {
      const [nameExists] = await pool.execute(
        'SELECT id FROM memory_types WHERE name = ? AND id != ?',
        [updates.name, id]
      );
      
      if (nameExists.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Memory type with this name already exists'
        });
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    
    Object.keys(updates).forEach(key => {
      updateFields.push(`${key} = ?`);
      updateValues.push(updates[key]);
    });
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updateValues.push(id);
    
    await pool.execute(
      `UPDATE memory_types SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      updateValues
    );

    // Fetch updated memory type
    const [updatedMemoryType] = await pool.execute(`
      SELECT id, name, display_name, description, icon, color,
             is_active, sort_order, created_at, updated_at
      FROM memory_types WHERE id = ?
    `, [id]);

    res.json({
      success: true,
      memoryType: updatedMemoryType[0]
    });
  } catch (error) {
    console.error('Error updating memory type:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update memory type' 
    });
  }
});

// Delete memory type
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if memory type exists
    const [existing] = await pool.execute(
      'SELECT * FROM memory_types WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Memory type not found'
      });
    }
    
    // Check if memory type is in use
    const [entriesUsing] = await pool.execute(
      'SELECT COUNT(*) as count FROM travel_entries WHERE memory_type = ?',
      [existing[0].name]
    );
    
    if (entriesUsing[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete memory type that is in use by travel entries'
      });
    }
    
    await pool.execute('DELETE FROM memory_types WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'Memory type deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting memory type:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete memory type' 
    });
  }
});

module.exports = router;