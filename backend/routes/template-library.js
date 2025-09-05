const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user's template library (saved public templates)
router.get('/library', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    const [templates] = await connection.execute(
      `SELECT 
        utl.id as library_id,
        utl.custom_title,
        utl.custom_description,
        utl.custom_category,
        utl.saved_at,
        c.id as template_id,
        c.title as original_title,
        c.description as original_description,
        c.category as original_category,
        c.color,
        c.usage_count,
        u.username as created_by,
        COUNT(ci.id) as total_items
       FROM user_template_library utl
       JOIN checklists c ON utl.original_template_id = c.id
       JOIN users u ON c.user_id = u.id
       LEFT JOIN checklist_items ci ON c.id = ci.checklist_id
       WHERE utl.user_id = ?
       GROUP BY utl.id
       ORDER BY utl.saved_at DESC`,
      [req.user.id]
    );
    
    connection.release();
    res.json(templates);
  } catch (error) {
    console.error('Error fetching template library:', error);
    res.status(500).json({ error: 'Failed to fetch template library' });
  }
});

// Save a public template to user's library
router.post('/library/save/:templateId', authenticateToken, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { customTitle, customDescription, customCategory } = req.body;
    
    console.log('Save to library request:', {
      templateId,
      userId: req.user?.id,
      customTitle,
      customDescription,
      customCategory
    });
    
    const connection = await pool.getConnection();
    
    // Verify template exists and is public
    const [templates] = await connection.execute(
      'SELECT * FROM checklists WHERE id = ? AND is_public = 1 AND is_template = 1',
      [templateId]
    );
    
    console.log('Template query result:', templates.length > 0 ? 'Found' : 'Not found');
    
    if (templates.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Public template not found' });
    }
    
    console.log('Attempting to save to user_template_library...');
    
    // Save to user's library (or update if already exists)
    await connection.execute(
      `INSERT INTO user_template_library 
       (user_id, original_template_id, custom_title, custom_description, custom_category)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       custom_title = VALUES(custom_title),
       custom_description = VALUES(custom_description),
       custom_category = VALUES(custom_category),
       saved_at = CURRENT_TIMESTAMP`,
      [
        req.user.id, 
        templateId, 
        customTitle || null, 
        customDescription || null, 
        customCategory || null
      ]
    );
    
    console.log('Successfully saved to library, updating usage stats...');
    
    // Update usage stats
    await connection.execute(
      'UPDATE checklists SET usage_count = usage_count + 1, last_used_at = CURRENT_TIMESTAMP WHERE id = ?',
      [templateId]
    );
    
    console.log('Usage stats updated successfully');
    
    connection.release();
    res.json({ message: 'Template saved to library successfully' });
  } catch (error) {
    console.error('Error saving template to library:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    res.status(500).json({ 
      error: 'Failed to save template to library',
      details: error.message 
    });
  }
});

// Remove template from user's library
router.delete('/library/:libraryId', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    const [result] = await connection.execute(
      'DELETE FROM user_template_library WHERE id = ? AND user_id = ?',
      [req.params.libraryId, req.user.id]
    );
    
    connection.release();
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Template not found in library' });
    }
    
    res.json({ message: 'Template removed from library successfully' });
  } catch (error) {
    console.error('Error removing template from library:', error);
    res.status(500).json({ error: 'Failed to remove template from library' });
  }
});

// Get master template catalog (public templates)
router.get('/catalog', async (req, res) => {
  try {
    const { category, search, sort = 'recent', page = 1, limit = 20 } = req.query;
    
    // Ensure numeric values are properly parsed
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const offset = (pageNum - 1) * limitNum;
    
    const connection = await pool.getConnection();
    
    let query = `
      SELECT 
        c.id,
        c.title,
        c.description,
        c.category,
        c.color,
        c.usage_count,
        c.created_at,
        c.last_used_at,
        u.username as created_by,
        COUNT(ci.id) as total_items,
        COUNT(CASE WHEN ci.is_completed = 0 THEN 1 END) as active_items
      FROM checklists c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN checklist_items ci ON c.id = ci.checklist_id
      WHERE c.is_public = 1 AND c.is_template = 1
    `;
    
    const params = [];
    
    if (category && category !== 'all') {
      query += ' AND c.category = ?';
      params.push(category);
    }
    
    if (search) {
      query += ' AND (c.title LIKE ? OR c.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' GROUP BY c.id';
    
    // Add sorting
    switch (sort) {
      case 'popular':
        query += ' ORDER BY c.usage_count DESC, c.created_at DESC';
        break;
      case 'recent':
        query += ' ORDER BY c.created_at DESC';
        break;
      case 'alphabetical':
        query += ' ORDER BY c.title ASC';
        break;
      default:
        query += ' ORDER BY c.created_at DESC';
    }
    
    // Add pagination - hardcode limit/offset to avoid parameter binding issues
    query += ` LIMIT ${limitNum} OFFSET ${offset}`;
    
    console.log('Query:', query);
    console.log('Params count:', params.length);
    console.log('Params:', params);
    
    const [templates] = await connection.execute(query, params);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT c.id) as total
      FROM checklists c
      WHERE c.is_public = 1 AND c.is_template = 1
    `;
    
    const countParams = [];
    
    if (category && category !== 'all') {
      countQuery += ' AND c.category = ?';
      countParams.push(category);
    }
    
    if (search) {
      countQuery += ' AND (c.title LIKE ? OR c.description LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }
    
    console.log('Count Query:', countQuery);
    console.log('Count Params:', countParams);
    
    const [countResult] = await connection.execute(countQuery, countParams);
    
    connection.release();
    
    res.json({
      templates,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching template catalog:', error);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch template catalog',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create checklist from template (creates a regular checklist, not an instance)
router.post('/instances/create', [
  body('templateId').isInt(),
  body('instanceType').optional().isIn(['journey', 'dream', 'standalone']),
  body('instanceReferenceId').optional().isInt(),
  body('customTitle').optional().trim(),
  body('customDescription').optional().trim()
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { templateId, customTitle, customDescription } = req.body;
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Get template details
      const [templates] = await connection.execute(
        `SELECT * FROM checklists 
         WHERE id = ? AND (user_id = ? OR (is_public = 1 AND is_template = 1))`,
        [templateId, req.user.id]
      );
      
      if (templates.length === 0) {
        throw new Error('Template not found or not accessible');
      }
      
      const template = templates[0];
      
      // Create a regular checklist (not an instance)
      const [checklistResult] = await connection.execute(
        `INSERT INTO checklists 
         (user_id, title, description, category, color, is_template, is_public)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          customTitle || `${template.title} (Copy)`,
          customDescription || template.description,
          template.category,
          template.color,
          false, // Not a template
          false  // Not public
        ]
      );
      
      const checklistId = checklistResult.insertId;
      
      // Copy template items to the new checklist
      const [templateItems] = await connection.execute(
        'SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY sort_order ASC',
        [templateId]
      );
      
      for (const item of templateItems) {
        await connection.execute(
          `INSERT INTO checklist_items 
           (checklist_id, text, description, sort_order, category, priority, due_date, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            checklistId,
            item.text,
            item.description || null,
            item.sort_order,
            item.category,
            item.priority,
            item.due_date || null,
            item.notes || null
          ]
        );
      }
      
      // Update template usage stats
      await connection.execute(
        'UPDATE checklists SET usage_count = usage_count + 1, last_used_at = CURRENT_TIMESTAMP WHERE id = ?',
        [templateId]
      );
      
      await connection.commit();
      
      // Get the created checklist with items
      const [newChecklist] = await connection.execute(
        'SELECT * FROM checklists WHERE id = ?',
        [checklistId]
      );
      
      const [newItems] = await connection.execute(
        'SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY sort_order ASC',
        [checklistId]
      );
      
      connection.release();
      
      res.status(201).json({
        ...newChecklist[0],
        items: newItems
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

// Get user's checklist instances
router.get('/instances', authenticateToken, async (req, res) => {
  try {
    const { instanceType, instanceReferenceId } = req.query;
    
    const connection = await pool.getConnection();
    
    let query = `
      SELECT 
        ci.*,
        c.title as template_title,
        COUNT(cii.id) as total_items,
        COUNT(CASE WHEN cii.is_completed = 1 THEN 1 END) as completed_items
      FROM checklist_instances ci
      JOIN checklists c ON ci.template_id = c.id
      LEFT JOIN checklist_instance_items cii ON ci.id = cii.instance_id
      WHERE ci.user_id = ?
    `;
    
    const params = [req.user.id];
    
    if (instanceType) {
      query += ' AND ci.instance_type = ?';
      params.push(instanceType);
    }
    
    if (instanceReferenceId) {
      query += ' AND ci.instance_reference_id = ?';
      params.push(instanceReferenceId);
    }
    
    query += ' GROUP BY ci.id ORDER BY ci.created_at DESC';
    
    const [instances] = await connection.execute(query, params);
    
    connection.release();
    res.json(instances);
  } catch (error) {
    console.error('Error fetching checklist instances:', error);
    res.status(500).json({ error: 'Failed to fetch checklist instances' });
  }
});

module.exports = router;
