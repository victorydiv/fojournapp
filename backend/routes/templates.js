const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all public templates (catalog)
router.get('/catalog', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const category = req.query.category;
    const search = req.query.search;
    
    let whereClause = '';
    let queryParams = [];
    
    if (category && category !== 'all') {
      whereClause += ' WHERE t.category = ?';
      queryParams.push(category);
    }
    
    if (search) {
      whereClause += whereClause ? ' AND' : ' WHERE';
      whereClause += ' (t.title LIKE ? OR t.description LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`);
    }
    
    const connection = await pool.getConnection();
    
    // Get templates with creator info
    const query = `
      SELECT t.*, u.username as creator_username, u.first_name, u.last_name,
             COUNT(ti.id) as item_count
      FROM templates t
      LEFT JOIN users u ON t.creator_id = u.id
      LEFT JOIN template_items ti ON t.id = ti.template_id
      ${whereClause}
      GROUP BY t.id
      ORDER BY t.usage_count DESC, t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const [templates] = await connection.execute(query, queryParams);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT t.id) as total
      FROM templates t
      ${whereClause}
    `;
    const [countResult] = await connection.execute(countQuery, queryParams);
    
    connection.release();
    
    res.json({
      templates,
      total: countResult[0].total,
      page,
      totalPages: Math.ceil(countResult[0].total / limit)
    });
  } catch (error) {
    console.error('Error fetching template catalog:', error);
    res.status(500).json({ error: 'Failed to fetch template catalog' });
  }
});

// Get template details with items
router.get('/:id', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Get template info
    const [templateRows] = await connection.execute(`
      SELECT t.*, u.username as creator_username, u.first_name, u.last_name
      FROM templates t
      LEFT JOIN users u ON t.creator_id = u.id
      WHERE t.id = ?
    `, [req.params.id]);
    
    if (templateRows.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Get template items
    const [items] = await connection.execute(`
      SELECT * FROM template_items 
      WHERE template_id = ? 
      ORDER BY sort_order, id
    `, [req.params.id]);
    
    connection.release();
    
    const template = {
      ...templateRows[0],
      items
    };
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Create template from checklist
router.post('/from-checklist/:checklistId', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Get checklist data
    const [checklistRows] = await connection.execute(`
      SELECT * FROM checklists 
      WHERE id = ? AND user_id = ?
    `, [req.params.checklistId, req.user.id]);
    
    if (checklistRows.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Checklist not found' });
    }
    
    const checklist = checklistRows[0];
    
    await connection.beginTransaction();
    
    try {
      // Create template
      const [templateResult] = await connection.execute(`
        INSERT INTO templates (creator_id, title, description, category, color)
        VALUES (?, ?, ?, ?, ?)
      `, [
        req.user.id,
        checklist.title,
        checklist.description,
        checklist.category,
        checklist.color
      ]);
      
      const templateId = templateResult.insertId;
      
      // Copy items to template
      const [items] = await connection.execute(`
        SELECT * FROM checklist_items 
        WHERE checklist_id = ? 
        ORDER BY sort_order
      `, [req.params.checklistId]);
      
      for (const item of items) {
        await connection.execute(`
          INSERT INTO template_items (template_id, text, category, priority, sort_order)
          VALUES (?, ?, ?, ?, ?)
        `, [templateId, item.text, item.category, item.priority, item.sort_order]);
      }
      
      await connection.commit();
      connection.release();
      
      res.json({ 
        message: 'Template created successfully',
        templateId: templateId
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error creating template from checklist:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Create checklist from template
router.post('/:id/create-checklist', authenticateToken, async (req, res) => {
  try {
    const { title } = req.body;
    
    const connection = await pool.getConnection();
    
    // Get template data
    const [templateRows] = await connection.execute(`
      SELECT * FROM templates WHERE id = ?
    `, [req.params.id]);
    
    if (templateRows.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const template = templateRows[0];
    
    await connection.beginTransaction();
    
    try {
      // Create new checklist
      const [checklistResult] = await connection.execute(`
        INSERT INTO checklists (user_id, title, description, category, color, is_template, is_public)
        VALUES (?, ?, ?, ?, ?, false, false)
      `, [
        req.user.id,
        title || template.title,
        template.description,
        template.category,
        template.color
      ]);
      
      const checklistId = checklistResult.insertId;
      
      // Copy template items to checklist
      const [items] = await connection.execute(`
        SELECT * FROM template_items 
        WHERE template_id = ? 
        ORDER BY sort_order
      `, [req.params.id]);
      
      for (const item of items) {
        await connection.execute(`
          INSERT INTO checklist_items (checklist_id, text, category, priority, sort_order, is_completed)
          VALUES (?, ?, ?, ?, ?, false)
        `, [checklistId, item.text, item.category, item.priority, item.sort_order]);
      }
      
      // Update template usage count
      await connection.execute(`
        UPDATE templates 
        SET usage_count = usage_count + 1, last_used_at = NOW()
        WHERE id = ?
      `, [req.params.id]);
      
      await connection.commit();
      connection.release();
      
      res.json({ 
        message: 'Checklist created from template successfully',
        checklistId: checklistId
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error creating checklist from template:', error);
    res.status(500).json({ error: 'Failed to create checklist from template' });
  }
});

// Save template to user's library
router.post('/:id/save', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Check if template exists
    const [templateRows] = await connection.execute(`
      SELECT id FROM templates WHERE id = ?
    `, [req.params.id]);
    
    if (templateRows.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Check if already saved
    const [existingRows] = await connection.execute(`
      SELECT id FROM user_template_library 
      WHERE user_id = ? AND original_template_id = ?
    `, [req.user.id, req.params.id]);
    
    if (existingRows.length > 0) {
      connection.release();
      return res.status(400).json({ error: 'Template already saved to library' });
    }
    
    // Save to library
    await connection.execute(`
      INSERT INTO user_template_library (user_id, original_template_id, saved_at)
      VALUES (?, ?, NOW())
    `, [req.user.id, req.params.id]);
    
    connection.release();
    res.json({ message: 'Template saved to library successfully' });
  } catch (error) {
    console.error('Error saving template to library:', error);
    res.status(500).json({ error: 'Failed to save template to library' });
  }
});

// Get user's saved templates
router.get('/library/my-templates', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    const [templates] = await connection.execute(`
      SELECT t.id as template_id, t.creator_id, 
             t.title as original_title, t.description as original_description, 
             t.category as original_category, t.color, 
             t.usage_count, t.last_used_at, t.created_at, t.updated_at,
             utl.id as library_id, utl.saved_at, utl.custom_title, utl.custom_description, utl.custom_category,
             CONCAT(u.first_name, ' ', u.last_name) as created_by,
             (SELECT COUNT(*) FROM template_items WHERE template_id = t.id) as total_items
      FROM user_template_library utl
      JOIN templates t ON utl.original_template_id = t.id
      LEFT JOIN users u ON t.creator_id = u.id
      WHERE utl.user_id = ?
      ORDER BY utl.saved_at DESC
    `, [req.user.id]);
    
    connection.release();
    res.json(templates);
  } catch (error) {
    console.error('Error fetching user template library:', error);
    res.status(500).json({ error: 'Failed to fetch template library' });
  }
});

// Remove template from user's library
router.delete('/library/:libraryId', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Delete from user's library (only if it belongs to the user)
    const [result] = await connection.execute(`
      DELETE FROM user_template_library 
      WHERE id = ? AND user_id = ?
    `, [req.params.libraryId, req.user.id]);
    
    if (result.affectedRows === 0) {
      connection.release();
      return res.status(404).json({ error: 'Template not found in your library' });
    }
    
    connection.release();
    res.json({ message: 'Template removed from library successfully' });
  } catch (error) {
    console.error('Error removing template from library:', error);
    res.status(500).json({ error: 'Failed to remove template from library' });
  }
});

// Delete template (only creator can delete)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Check if user is the creator
    const [templateRows] = await connection.execute(`
      SELECT creator_id FROM templates WHERE id = ?
    `, [req.params.id]);
    
    if (templateRows.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Template not found' });
    }
    
    if (templateRows[0].creator_id !== req.user.id) {
      connection.release();
      return res.status(403).json({ error: 'Only the template creator can delete this template' });
    }
    
    // Delete template (cascade will handle items and library entries)
    await connection.execute(`
      DELETE FROM templates WHERE id = ?
    `, [req.params.id]);
    
    connection.release();
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

module.exports = router;
