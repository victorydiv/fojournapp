const express = require('express');
const path = require('path');
const { body, validationResult, query } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all travel entries for the authenticated user
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sortBy').optional().isIn(['entry_date', 'created_at', 'title']),
  query('sortOrder').optional().isIn(['ASC', 'DESC']),
  query('date').optional().isISO8601(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Debug logging
    console.log('User ID:', req.user?.id);
    console.log('Query params:', req.query);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const sortBy = req.query.sortBy || 'entry_date';
    const sortOrder = req.query.sortOrder || 'DESC';
    const offset = (page - 1) * limit;
    const { date, startDate, endDate } = req.query;

    // Ensure all parameters are valid
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log('Parameters:', { userId: req.user.id, limit, offset, page, date, startDate, endDate });

    // Build WHERE clause for date filtering
    let whereClause = 'WHERE user_id = ?';
    let queryParams = [req.user.id];

    if (date) {
      whereClause += ' AND DATE(entry_date) = ?';
      queryParams.push(date);
    } else if (startDate && endDate) {
      whereClause += ' AND DATE(entry_date) BETWEEN ? AND ?';
      queryParams.push(startDate, endDate);
    } else if (startDate) {
      whereClause += ' AND DATE(entry_date) >= ?';
      queryParams.push(startDate);
    } else if (endDate) {
      whereClause += ' AND DATE(entry_date) <= ?';
      queryParams.push(endDate);
    }

    // Validate and sanitize sort parameters
    const allowedSortFields = ['entry_date', 'created_at', 'updated_at', 'title'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'entry_date';
    const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get total count with date filtering
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM travel_entries ${whereClause}`,
      queryParams
    );
    const total = countResult[0].total;

    // Get entries with pagination and date filtering
    const sqlQuery = `SELECT 
        id, title, description, latitude, longitude, 
        location_name as locationName, 
        memory_type as memoryType,
        restaurant_rating as restaurantRating,
        is_dog_friendly as isDogFriendly,
        entry_date as entryDate, 
        created_at as createdAt, 
        updated_at as updatedAt
       FROM travel_entries 
       ${whereClause}
       ORDER BY ${validSortBy} ${validSortOrder}
       ${date ? '' : `LIMIT ${limit} OFFSET ${offset}`}`;
    
    console.log('Executing SQL:', sqlQuery);
    console.log('With parameters:', queryParams);
    
    const [entries] = await pool.execute(sqlQuery, queryParams);

    // Get media files and links for each entry
    for (let entry of entries) {
      // Convert numeric fields from strings to numbers
      entry.latitude = parseFloat(entry.latitude);
      entry.longitude = parseFloat(entry.longitude);
      
      // Get media files
      const [media] = await pool.execute(
        `SELECT 
          id, 
          file_name as fileName, 
          original_name as originalName, 
          file_type as fileType, 
          mime_type as mimeType,
          thumbnail_path as thumbnailPath
         FROM media_files 
         WHERE entry_id = ?`,
        [entry.id]
      );
      // Get the JWT token from the request header
      const token = req.headers.authorization?.replace('Bearer ', '');
      entry.media = media.map(file => {
        const baseUrl = `${req.protocol}://${req.get('host')}/api/media/file/`;
        let thumbnailUrl = undefined;
        
        if (file.thumbnailPath) {
          // Extract filename from full path
          const thumbnailFileName = path.basename(file.thumbnailPath);
          thumbnailUrl = `${baseUrl}${thumbnailFileName}?token=${token}`;
        }
        
        return {
          ...file,
          url: `${baseUrl}${file.fileName}?token=${token}`,
          thumbnailUrl
        };
      });

      // Get activity links
      const [links] = await pool.execute(
        `SELECT 
          id, title, url, description, 
          link_type as linkType 
         FROM activity_links 
         WHERE entry_id = ?`,
        [entry.id]
      );
      entry.links = links;

      // Get tags
      const [tags] = await pool.execute(
        'SELECT tag FROM entry_tags WHERE entry_id = ?',
        [entry.id]
      );
      entry.tags = tags.map(t => t.tag);
    }

    res.json({
      entries,
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
    console.error('Get entries error:', error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// Get a specific travel entry
router.get('/:id', async (req, res) => {
  try {
    const entryId = parseInt(req.params.id);
    
    const [entries] = await pool.execute(
      `SELECT 
        id, title, description, latitude, longitude, 
        location_name as locationName, 
        memory_type as memoryType,
        restaurant_rating as restaurantRating,
        is_dog_friendly as isDogFriendly,
        entry_date as entryDate, 
        created_at as createdAt, 
        updated_at as updatedAt
       FROM travel_entries 
       WHERE id = ? AND user_id = ?`,
      [entryId, req.user.id]
    );

    if (entries.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const entry = entries[0];
    
    // Convert numeric fields from strings to numbers
    entry.latitude = parseFloat(entry.latitude);
    entry.longitude = parseFloat(entry.longitude);

    // Get media files
    const [media] = await pool.execute(
      `SELECT 
        id, 
        file_name as fileName, 
        original_name as originalName, 
        file_type as fileType, 
        file_size as fileSize, 
        mime_type as mimeType, 
        uploaded_at as uploadedAt,
        thumbnail_path as thumbnailPath
       FROM media_files 
       WHERE entry_id = ?`,
      [entry.id]
    );
    // Add URL for each media file
    const token = req.headers.authorization?.replace('Bearer ', '');
    entry.media = media.map(file => {
      const baseUrl = `${req.protocol}://${req.get('host')}/api/media/file/`;
      let thumbnailUrl = undefined;
      
      if (file.thumbnailPath) {
        // Extract filename from full path
        const thumbnailFileName = path.basename(file.thumbnailPath);
        thumbnailUrl = `${baseUrl}${thumbnailFileName}?token=${token}`;
      }
      
      return {
        ...file,
        url: `${baseUrl}${file.fileName}?token=${token}`,
        thumbnailUrl
      };
    });

    // Get activity links
    const [links] = await pool.execute(
      `SELECT 
        id, title, url, description, 
        link_type as linkType, 
        created_at as createdAt 
       FROM activity_links 
       WHERE entry_id = ?`,
      [entry.id]
    );
    entry.links = links;

    // Get tags
    const [tags] = await pool.execute(
      'SELECT tag FROM entry_tags WHERE entry_id = ?',
      [entry.id]
    );
    entry.tags = tags.map(t => t.tag);

    res.json({ entry });
  } catch (error) {
    console.error('Get entry error:', error);
    res.status(500).json({ error: 'Failed to fetch entry' });
  }
});

// Create a new travel entry
router.post('/', [
  body('title').isLength({ min: 1, max: 200 }).trim(),
  body('description').optional().isLength({ max: 5000 }).trim(),
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
  body('locationName').optional().isLength({ max: 255 }).trim(),
  body('memoryType').optional().isIn(['attraction', 'restaurant', 'accommodation', 'activity', 'brewery', 'other']),
  body('restaurantRating').optional().isIn(['happy', 'sad', 'neutral']),
  body('isDogFriendly').optional().isBoolean(),
  body('entryDate').isISO8601().toDate(),
  body('tags').optional().isArray(),
  body('links').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, latitude, longitude, locationName, memoryType, restaurantRating, isDogFriendly, entryDate, tags, links } = req.body;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Insert travel entry
      const [entryResult] = await connection.execute(
        'INSERT INTO travel_entries (user_id, title, description, latitude, longitude, location_name, memory_type, restaurant_rating, is_dog_friendly, entry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [req.user.id, title, description || null, latitude, longitude, locationName || null, memoryType || 'other', restaurantRating || null, isDogFriendly || false, entryDate]
      );

      const entryId = entryResult.insertId;

      // Insert tags if provided
      if (tags && tags.length > 0) {
        for (const tag of tags) {
          if (tag && tag.trim()) {
            await connection.execute(
              'INSERT IGNORE INTO entry_tags (entry_id, tag) VALUES (?, ?)',
              [entryId, tag.trim().toLowerCase()]
            );
          }
        }
      }

      // Insert activity links if provided
      if (links && links.length > 0) {
        for (const link of links) {
          if (link.title && link.url) {
            await connection.execute(
              'INSERT INTO activity_links (entry_id, title, url, description, link_type) VALUES (?, ?, ?, ?, ?)',
              [entryId, link.title, link.url, link.description || null, link.linkType || 'other']
            );
          }
        }
      }

      await connection.commit();

      // Fetch the created entry with all related data
      const [newEntry] = await connection.execute(
        `SELECT 
          id, title, description, latitude, longitude, location_name, 
          memory_type, restaurant_rating, is_dog_friendly,
          entry_date, created_at, updated_at
         FROM travel_entries 
         WHERE id = ?`,
        [entryId]
      );

      res.status(201).json({
        message: 'Entry created successfully',
        entry: newEntry[0]
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Create entry error:', error);
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

// Update a travel entry
router.put('/:id', [
  body('title').optional().isLength({ min: 1, max: 200 }).trim(),
  body('description').optional().isLength({ max: 5000 }).trim(),
  body('latitude').optional().isFloat({ min: -90, max: 90 }),
  body('longitude').optional().isFloat({ min: -180, max: 180 }),
  body('locationName').optional().isLength({ max: 255 }).trim(),
  body('memoryType').optional().isIn(['attraction', 'restaurant', 'accommodation', 'activity', 'brewery', 'other']),
  body('restaurantRating').optional().isIn(['happy', 'sad', 'neutral']),
  body('isDogFriendly').optional().isBoolean(),
  body('entryDate').optional().isISO8601().toDate(),
  body('tags').optional().isArray(),
  body('links').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const entryId = parseInt(req.params.id);
    const { title, description, latitude, longitude, locationName, memoryType, restaurantRating, isDogFriendly, entryDate, tags, links } = req.body;

    // Check if entry exists and belongs to user
    const [existingEntries] = await pool.execute(
      'SELECT id FROM travel_entries WHERE id = ? AND user_id = ?',
      [entryId, req.user.id]
    );

    if (existingEntries.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Build dynamic update query
      const updates = [];
      const values = [];

      if (title !== undefined) {
        updates.push('title = ?');
        values.push(title);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }
      if (latitude !== undefined) {
        updates.push('latitude = ?');
        values.push(latitude);
      }
      if (longitude !== undefined) {
        updates.push('longitude = ?');
        values.push(longitude);
      }
      if (locationName !== undefined) {
        updates.push('location_name = ?');
        values.push(locationName);
      }
      if (memoryType !== undefined) {
        updates.push('memory_type = ?');
        values.push(memoryType);
      }
      if (restaurantRating !== undefined) {
        updates.push('restaurant_rating = ?');
        values.push(restaurantRating);
      }
      if (isDogFriendly !== undefined) {
        updates.push('is_dog_friendly = ?');
        values.push(isDogFriendly);
      }
      if (entryDate !== undefined) {
        // Convert Date object to MySQL DATE format (YYYY-MM-DD)
        let formattedDate;
        if (entryDate instanceof Date) {
          // Format Date object to YYYY-MM-DD string
          formattedDate = entryDate.toISOString().split('T')[0];
        } else {
          // If it's already a string, use as-is
          formattedDate = entryDate;
        }
        updates.push('entry_date = ?');
        values.push(formattedDate);
      }

      if (updates.length > 0) {
        values.push(entryId);
        await connection.execute(
          `UPDATE travel_entries SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      }

      // Update tags if provided
      if (tags !== undefined) {
        // Remove existing tags
        await connection.execute('DELETE FROM entry_tags WHERE entry_id = ?', [entryId]);
        
        // Add new tags
        for (const tag of tags) {
          if (tag && tag.trim()) {
            await connection.execute(
              'INSERT INTO entry_tags (entry_id, tag) VALUES (?, ?)',
              [entryId, tag.trim().toLowerCase()]
            );
          }
        }
      }

      // Update links if provided
      if (links !== undefined) {
        // Remove existing links
        await connection.execute('DELETE FROM activity_links WHERE entry_id = ?', [entryId]);
        
        // Add new links
        for (const link of links) {
          if (link.title && link.url) {
            await connection.execute(
              'INSERT INTO activity_links (entry_id, title, url, description, link_type) VALUES (?, ?, ?, ?, ?)',
              [entryId, link.title, link.url, link.description || null, link.linkType || 'other']
            );
          }
        }
      }

      await connection.commit();

      res.json({ message: 'Entry updated successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Update entry error:', error);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

// Delete a travel entry
router.delete('/:id', async (req, res) => {
  try {
    const entryId = parseInt(req.params.id);

    // Check if entry exists and belongs to user
    const [existingEntries] = await pool.execute(
      'SELECT id FROM travel_entries WHERE id = ? AND user_id = ?',
      [entryId, req.user.id]
    );

    if (existingEntries.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // Delete entry (CASCADE will handle related records)
    await pool.execute('DELETE FROM travel_entries WHERE id = ?', [entryId]);

    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('Delete entry error:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

module.exports = router;
