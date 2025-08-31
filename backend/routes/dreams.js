const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { checkAndAwardBadges } = require('../utils/badgeUtils');

const router = express.Router();

// Helper function to safely parse JSON or return as-is if already parsed
const safeJSONParse = (value) => {
  if (!value) return [];
  if (typeof value === 'object') return value; // Already parsed
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error('Failed to parse JSON:', value, e);
      return [];
    }
  }
  return [];
};

// All routes require authentication
router.use(authenticateToken);

// Get all dreams for the authenticated user
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sortBy').optional().isIn(['created_at', 'title', 'priority', 'dream_type']),
  query('sortOrder').optional().isIn(['ASC', 'DESC']),
  query('dreamType').optional().isIn(['destination', 'attraction', 'restaurant', 'accommodation', 'activity', 'other']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('achieved').optional().isBoolean(),
  query('search').optional().isLength({ min: 1, max: 200 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder || 'DESC';
    const dreamType = req.query.dreamType;
    const priority = req.query.priority;
    const achieved = req.query.achieved;
    const search = req.query.search;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = 'WHERE user_id = ?';
    let queryParams = [req.user.id];

    if (dreamType) {
      whereClause += ' AND dream_type = ?';
      queryParams.push(dreamType);
    }

    if (priority) {
      whereClause += ' AND priority = ?';
      queryParams.push(priority);
    }

    if (achieved !== undefined) {
      whereClause += ' AND is_achieved = ?';
      queryParams.push(achieved);
    }

    if (search) {
      whereClause += ' AND (title LIKE ? OR description LIKE ? OR location_name LIKE ? OR notes LIKE ?)';
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM dreams ${whereClause}`,
      queryParams
    );
    const total = countResult[0].total;

    // Get dreams with pagination
    const sqlQuery = `
      SELECT 
        id, title, description, latitude, longitude, location_name, place_id,
        country, region, dream_type, priority, notes, tags, estimated_budget,
        best_time_to_visit, research_links, created_at, updated_at,
        is_achieved, achieved_at
      FROM dreams 
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [dreams] = await pool.execute(sqlQuery, queryParams);

    // Parse JSON fields
    const formattedDreams = dreams.map(dream => ({
      ...dream,
      latitude: parseFloat(dream.latitude),
      longitude: parseFloat(dream.longitude),
      tags: safeJSONParse(dream.tags),
      research_links: safeJSONParse(dream.research_links)
    }));

    res.json({
      dreams: formattedDreams,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get dreams error:', error);
    res.status(500).json({ error: 'Failed to fetch dreams' });
  }
});

// Get a specific dream
router.get('/:id', async (req, res) => {
  try {
    const dreamId = parseInt(req.params.id);
    
    const [dreams] = await pool.execute(
      `SELECT 
        id, title, description, latitude, longitude, location_name, place_id,
        country, region, dream_type, priority, notes, tags, estimated_budget,
        best_time_to_visit, research_links, created_at, updated_at,
        is_achieved, achieved_at
       FROM dreams 
       WHERE id = ? AND user_id = ?`,
      [dreamId, req.user.id]
    );

    if (dreams.length === 0) {
      return res.status(404).json({ error: 'Dream not found' });
    }

    const dream = dreams[0];
    
    // Parse JSON fields and convert coordinates
    const formattedDream = {
      ...dream,
      latitude: parseFloat(dream.latitude),
      longitude: parseFloat(dream.longitude),
      tags: safeJSONParse(dream.tags),
      research_links: safeJSONParse(dream.research_links)
    };

    res.json({ dream: formattedDream });
  } catch (error) {
    console.error('Get dream error:', error);
    res.status(500).json({ error: 'Failed to fetch dream' });
  }
});

// Create a new dream
router.post('/', [
  body('title').isLength({ min: 1, max: 255 }).trim(),
  body('description').optional().isLength({ max: 5000 }).trim(),
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
  body('location_name').optional().isLength({ max: 255 }).trim(),
  body('place_id').optional().isLength({ max: 255 }).trim(),
  body('country').optional().isLength({ max: 100 }).trim(),
  body('region').optional().isLength({ max: 100 }).trim(),
  body('dream_type').optional().isIn(['destination', 'attraction', 'restaurant', 'accommodation', 'activity', 'brewery', 'other']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('notes').optional().isLength({ max: 5000 }).trim(),
  body('tags').optional().isArray(),
  body('estimated_budget').optional().isFloat({ min: 0 }),
  body('best_time_to_visit').optional().isLength({ max: 100 }).trim(),
  body('research_links').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title, description, latitude, longitude, location_name, place_id,
      country, region, dream_type, priority, notes, tags, estimated_budget,
      best_time_to_visit, research_links
    } = req.body;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Insert dream
      const [result] = await connection.execute(
        `INSERT INTO dreams (
          user_id, title, description, latitude, longitude, location_name, place_id,
          country, region, dream_type, priority, notes, tags, estimated_budget,
          best_time_to_visit, research_links
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id, title, description || null, latitude, longitude, 
          location_name || null, place_id || null, country || null, region || null,
          dream_type || 'destination', priority || 'medium', notes || null,
          tags ? JSON.stringify(tags) : null, estimated_budget || null,
          best_time_to_visit || null, research_links ? JSON.stringify(research_links) : null
        ]
      );

      const dreamId = result.insertId;

      await connection.commit();

      // Check and award badges for dream creation
      let awardedBadges = [];
      try {
        awardedBadges = await checkAndAwardBadges(req.user.id, 'dream_created', {
          dreamId: dreamId,
          title: title,
          dreamType: dream_type || 'destination'
        });
        
        if (awardedBadges.length > 0) {
          console.log(`✓ User ${req.user.id} earned ${awardedBadges.length} badge(s) for creating dream:`, awardedBadges.map(b => b.name));
        }
      } catch (badgeError) {
        console.error('Badge checking error for dream creation:', badgeError);
        // Don't fail the dream creation if badge checking fails
      }

      // Fetch the created dream
      const [newDream] = await connection.execute(
        `SELECT 
          id, title, description, latitude, longitude, location_name, place_id,
          country, region, dream_type, priority, notes, tags, estimated_budget,
          best_time_to_visit, research_links, created_at, updated_at,
          is_achieved, achieved_at
         FROM dreams 
         WHERE id = ?`,
        [dreamId]
      );

      const dream = newDream[0];
      
      const formattedDream = {
        ...dream,
        latitude: parseFloat(dream.latitude),
        longitude: parseFloat(dream.longitude),
        tags: safeJSONParse(dream.tags),
        research_links: safeJSONParse(dream.research_links)
      };

      res.status(201).json({
        message: 'Dream created successfully',
        dream: formattedDream,
        awardedBadges: awardedBadges
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Create dream error:', error);
    res.status(500).json({ error: 'Failed to create dream' });
  }
});

// Update a dream
router.put('/:id', [
  body('title').optional().isLength({ min: 1, max: 255 }).trim(),
  body('description').optional().isLength({ max: 5000 }).trim(),
  body('latitude').optional().isFloat({ min: -90, max: 90 }),
  body('longitude').optional().isFloat({ min: -180, max: 180 }),
  body('location_name').optional().isLength({ max: 255 }).trim(),
  body('place_id').optional().isLength({ max: 255 }).trim(),
  body('country').optional().isLength({ max: 100 }).trim(),
  body('region').optional().isLength({ max: 100 }).trim(),
  body('dream_type').optional().isIn(['destination', 'attraction', 'restaurant', 'accommodation', 'activity', 'brewery', 'other']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('notes').optional().isLength({ max: 5000 }).trim(),
  body('tags').optional().isArray(),
  body('estimated_budget').optional().isFloat({ min: 0 }),
  body('best_time_to_visit').optional().isLength({ max: 100 }).trim(),
  body('research_links').optional().isArray(),
  body('is_achieved').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const dreamId = parseInt(req.params.id);
    const updateData = req.body;

    // Check if dream exists and belongs to user
    const [existingDreams] = await pool.execute(
      'SELECT id FROM dreams WHERE id = ? AND user_id = ?',
      [dreamId, req.user.id]
    );

    if (existingDreams.length === 0) {
      return res.status(404).json({ error: 'Dream not found' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Build dynamic update query
      const updates = [];
      const values = [];

      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          if (key === 'tags' || key === 'research_links') {
            updates.push(`${key} = ?`);
            values.push(JSON.stringify(updateData[key]));
          } else if (key === 'is_achieved' && updateData[key] === true) {
            updates.push(`${key} = ?`, 'achieved_at = CURRENT_TIMESTAMP');
            values.push(updateData[key]);
          } else {
            updates.push(`${key} = ?`);
            values.push(updateData[key]);
          }
        }
      });

      if (updates.length > 0) {
        values.push(dreamId);
        await connection.execute(
          `UPDATE dreams SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      }

      await connection.commit();
      res.json({ message: 'Dream updated successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Update dream error:', error);
    res.status(500).json({ error: 'Failed to update dream' });
  }
});

// Delete a dream
router.delete('/:id', async (req, res) => {
  try {
    const dreamId = parseInt(req.params.id);

    // Check if dream exists and belongs to user
    const [existingDreams] = await pool.execute(
      'SELECT id FROM dreams WHERE id = ? AND user_id = ?',
      [dreamId, req.user.id]
    );

    if (existingDreams.length === 0) {
      return res.status(404).json({ error: 'Dream not found' });
    }

    // Delete dream (CASCADE will handle related records)
    await pool.execute('DELETE FROM dreams WHERE id = ?', [dreamId]);

    res.json({ message: 'Dream deleted successfully' });
  } catch (error) {
    console.error('Delete dream error:', error);
    res.status(500).json({ error: 'Failed to delete dream' });
  }
});

// Mark dream as achieved
router.post('/:id/achieve', async (req, res) => {
  try {
    const dreamId = parseInt(req.params.id);

    // Check if dream exists and belongs to user
    const [existingDreams] = await pool.execute(
      'SELECT id, is_achieved FROM dreams WHERE id = ? AND user_id = ?',
      [dreamId, req.user.id]
    );

    if (existingDreams.length === 0) {
      return res.status(404).json({ error: 'Dream not found' });
    }

    if (existingDreams[0].is_achieved) {
      return res.status(400).json({ error: 'Dream already achieved' });
    }

    // Mark as achieved
    await pool.execute(
      'UPDATE dreams SET is_achieved = TRUE, achieved_at = CURRENT_TIMESTAMP WHERE id = ?',
      [dreamId]
    );

    res.json({ message: 'Dream marked as achieved!' });
  } catch (error) {
    console.error('Achieve dream error:', error);
    res.status(500).json({ error: 'Failed to mark dream as achieved' });
  }
});

// Get dreams statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const [stats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_dreams,
        COUNT(CASE WHEN is_achieved = TRUE THEN 1 END) as achieved_dreams,
        COUNT(CASE WHEN priority = 'high' OR priority = 'urgent' THEN 1 END) as high_priority_dreams,
        COUNT(CASE WHEN dream_type = 'destination' THEN 1 END) as destinations,
        COUNT(CASE WHEN dream_type = 'restaurant' THEN 1 END) as restaurants,
        COUNT(CASE WHEN dream_type = 'attraction' THEN 1 END) as attractions,
        AVG(estimated_budget) as avg_budget
       FROM dreams 
       WHERE user_id = ?`,
      [req.user.id]
    );

    res.json({ stats: stats[0] });
  } catch (error) {
    console.error('Get dreams stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dreams statistics' });
  }
});

module.exports = router;
