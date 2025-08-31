const express = require('express');
const path = require('path');
const { body, validationResult, query } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { checkAndAwardBadges, updateBadgeProgress } = require('../utils/badgeUtils');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get dashboard stats for all entry types
router.get('/stats', async (req, res) => {
  // Set cache control headers to prevent caching
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  try {
    const userId = req.user.id;
    console.log('Stats endpoint called for user:', userId);
    
    // Get memory stats - total and this month counts
    let memoryTotalStats = [{ total: 0, thisMonth: 0 }];
    let memoryTypeStats = [{ favoriteType: null }];
    let recentLocations = [];
    
    try {
      const [results] = await pool.execute(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) THEN 1 END) as thisMonth
         FROM travel_entries 
         WHERE user_id = ?`,
        [userId]
      );
      memoryTotalStats = results;
      console.log('Memory total stats:', memoryTotalStats);
    } catch (error) {
      console.error('Error getting memory total stats:', error.message);
    }
    
    // Get favorite memory type
    try {
      const [results] = await pool.execute(
        `SELECT memory_type as favoriteType
         FROM travel_entries 
         WHERE user_id = ? AND memory_type IS NOT NULL
         GROUP BY memory_type
         ORDER BY COUNT(*) DESC
         LIMIT 1`,
        [userId]
      );
      memoryTypeStats = results;
      console.log('Memory type stats:', memoryTypeStats);
    } catch (error) {
      console.error('Error getting memory type stats:', error.message);
    }
    
    // Get recent locations for memories
    try {
      const [results] = await pool.execute(
        `SELECT DISTINCT location_name 
         FROM travel_entries 
         WHERE user_id = ? AND location_name IS NOT NULL 
         ORDER BY created_at DESC 
         LIMIT 3`,
        [userId]
      );
      recentLocations = results;
      console.log('Recent locations:', recentLocations);
    } catch (error) {
      console.error('Error getting recent locations:', error.message);
    }
    
    // Get journey stats (if journeys table exists)
    let journeyStats = [{ total: 0, active: 0, completed: 0, upcoming: 0 }];
    try {
      const [journeys] = await pool.execute(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'planned' THEN 1 END) as upcoming
         FROM journeys 
         WHERE user_id = ?`,
        [userId]
      );
      journeyStats = journeys;
    } catch (error) {
      // Journeys table might not exist, use defaults
      console.log('Journeys table not found, using default stats');
    }
    
    // Get dream stats (if dreams table exists)
    let dreamStats = [{ total: 0, achieved: 0, pending: 0 }];
    let dreamTypeStats = [{ favoriteType: null }];
    try {
      const [dreams] = await pool.execute(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_achieved = 1 THEN 1 END) as achieved,
          COUNT(CASE WHEN is_achieved = 0 OR is_achieved IS NULL THEN 1 END) as pending
         FROM dreams 
         WHERE user_id = ?`,
        [userId]
      );
      dreamStats = dreams;
      
      // Get favorite dream type separately
      const [dreamTypes] = await pool.execute(
        `SELECT dream_type as favoriteType
         FROM dreams 
         WHERE user_id = ? AND dream_type IS NOT NULL
         GROUP BY dream_type
         ORDER BY COUNT(*) DESC
         LIMIT 1`,
        [userId]
      );
      dreamTypeStats = dreamTypes;
    } catch (error) {
      // Dreams table might not exist, use defaults
      console.log('Dreams table not found, using default stats');
    }
    
    const response = {
      memories: {
        total: memoryTotalStats[0]?.total || 0,
        thisMonth: memoryTotalStats[0]?.thisMonth || 0,
        favoriteType: memoryTypeStats[0]?.favoriteType,
        recentLocations: recentLocations.map(loc => loc.location_name)
      },
      journeys: {
        total: journeyStats[0]?.total || 0,
        active: journeyStats[0]?.active || 0,
        completed: journeyStats[0]?.completed || 0,
        upcoming: journeyStats[0]?.upcoming || 0
      },
      dreams: {
        total: dreamStats[0]?.total || 0,
        achieved: dreamStats[0]?.achieved || 0,
        pending: dreamStats[0]?.pending || 0,
        favoriteType: dreamTypeStats[0]?.favoriteType
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Get stats error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch stats', 
      details: error.message,
      code: error.code 
    });
  }
});

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
  // Set cache control headers to prevent caching
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
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
        const baseUrl = `${process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? 'https://fojourn.site' : 'http://localhost:3001')}/api/media/file/`;
        let thumbnailUrl = undefined;
        
        // Only generate thumbnailUrl if thumbnailPath exists and is not empty
        if (file.thumbnailPath && file.thumbnailPath.trim() !== '') {
          // Extract filename from full path
          const thumbnailFileName = path.basename(file.thumbnailPath);
          thumbnailUrl = `${baseUrl}${thumbnailFileName}?token=${token}`;
        }
        
        return {
          ...file,
          url: `${baseUrl}${file.fileName}?token=${token}`,
          thumbnailUrl: thumbnailUrl // Only include if it exists
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
  // Set cache control headers to prevent caching
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  try {
    const entryId = parseInt(req.params.id);
    
    const [entries] = await pool.execute(
      `SELECT 
        id, title, description, latitude, longitude, 
        location_name as locationName, 
        memory_type as memoryType,
        restaurant_rating as restaurantRating,
        is_dog_friendly as isDogFriendly,
        is_public as isPublic,
        public_slug as publicSlug,
        featured,
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
      const baseUrl = `${process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? 'https://fojourn.site' : 'http://localhost:3001')}/api/media/file/`;
      let thumbnailUrl = undefined;
      
      // Only generate thumbnailUrl if thumbnailPath exists and is not empty
      if (file.thumbnailPath && file.thumbnailPath.trim() !== '') {
        // Extract filename from full path
        const thumbnailFileName = path.basename(file.thumbnailPath);
        thumbnailUrl = `${baseUrl}${thumbnailFileName}?token=${token}`;
      }
      
      return {
        ...file,
        url: `${baseUrl}${file.fileName}?token=${token}`,
        thumbnailUrl: thumbnailUrl // Only include if it exists
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
  body('restaurantRating').optional({ values: 'null' }).isIn(['happy', 'sad', 'neutral']),
  body('isDogFriendly').optional().isBoolean(),
  body('entryDate').isISO8601().toDate(),
  body('tags').optional().isArray(),
  body('links').optional().isArray(),
  body('dreamId').optional().isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, latitude, longitude, locationName, memoryType, restaurantRating, isDogFriendly, entryDate, tags, links, dreamId } = req.body;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Insert travel entry
      const [entryResult] = await connection.execute(
        'INSERT INTO travel_entries (user_id, title, description, latitude, longitude, location_name, memory_type, restaurant_rating, is_dog_friendly, entry_date, dream_achieved) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [req.user.id, title, description || null, latitude, longitude, locationName || null, memoryType || 'other', restaurantRating || null, isDogFriendly || false, entryDate, dreamId ? true : false]
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

      // Check and award badges for memory creation
      try {
        const actionData = {
          type: memoryType || 'other',
          tags: tags || [],
          locationName: locationName,
          latitude: latitude,
          longitude: longitude
        };
        
        // Check for badges
        const awardedBadges = await checkAndAwardBadges(req.user.id, 'memory_created', actionData);
        
        // Update badge progress
        await updateBadgeProgress(req.user.id, 'memory_created', actionData);
        
        if (awardedBadges.length > 0) {
          console.log(`✓ User ${req.user.id} earned ${awardedBadges.length} badge(s):`, awardedBadges.map(b => b.name));
        }
      } catch (badgeError) {
        console.error('Badge checking error:', badgeError);
        // Don't fail the entry creation if badge checking fails
      }

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
  body('restaurantRating').optional({ values: 'null' }).isIn(['happy', 'sad', 'neutral']),
  body('isDogFriendly').optional().isBoolean(),
  body('entryDate').optional().isISO8601().toDate(),
  body('tags').optional().isArray(),
  body('links').optional().isArray()
], async (req, res) => {
  try {
    console.log('=== UPDATE ENTRY REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Entry ID:', req.params.id);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', JSON.stringify(errors.array(), null, 2));
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

      // Check and award badges for memory update
      try {
        // Get the updated entry data for badge checking
        const [updatedEntry] = await pool.execute(
          'SELECT memory_type, location_name, latitude, longitude FROM travel_entries WHERE id = ?',
          [entryId]
        );
        
        if (updatedEntry.length > 0) {
          const entry = updatedEntry[0];
          
          // Get current tags for the entry
          const [currentTags] = await pool.execute(
            'SELECT tag FROM entry_tags WHERE entry_id = ?',
            [entryId]
          );
          
          const actionData = {
            type: entry.memory_type || 'other',
            tags: currentTags.map(t => t.tag) || [],
            locationName: entry.location_name,
            latitude: entry.latitude,
            longitude: entry.longitude
          };
          
          // Check for badges (memory updates can trigger count-based, tag-based, and location-based badges)
          const awardedBadges = await checkAndAwardBadges(req.user.id, 'memory_updated', actionData);
          
          // Also check with memory_created action in case the update changed memory type or added new tags
          const createdBadges = await checkAndAwardBadges(req.user.id, 'memory_created', actionData);
          
          // Update badge progress
          await updateBadgeProgress(req.user.id, 'memory_updated', actionData);
          
          const allBadges = [...awardedBadges, ...createdBadges];
          if (allBadges.length > 0) {
            console.log(`✓ User ${req.user.id} earned ${allBadges.length} badge(s) from memory update:`, allBadges.map(b => b.name));
          }
        }
      } catch (badgeError) {
        console.error('Badge checking error during memory update:', badgeError);
        // Don't fail the entry update if badge checking fails
      }

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

// Make memory public/private
router.put('/:id/visibility', [
  body('isPublic').isBoolean(),
  body('featured').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const entryId = req.params.id;
    const userId = req.user.id;
    const { isPublic, featured = false } = req.body;

    // Verify entry ownership
    const [entries] = await pool.execute(
      'SELECT id, title, user_id FROM travel_entries WHERE id = ? AND user_id = ?',
      [entryId, userId]
    );

    if (entries.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const entry = entries[0];
    const { generateSlug, copyMediaToPublic, removeMediaFromPublic } = require('../utils/publicUtils');

    let publicSlug = null;
    
    if (isPublic) {
      // Generate slug for public URL
      publicSlug = generateSlug(entry.title, entry.id);
      
      // Get media files for this entry
      const [mediaFiles] = await pool.execute(
        'SELECT file_name FROM media_files WHERE entry_id = ?',
        [entryId]
      );
      
      // Copy media to public directory
      if (mediaFiles.length > 0) {
        await copyMediaToPublic(entryId, userId, mediaFiles);
      }
    } else {
      // Remove media from public directory
      await removeMediaFromPublic(entryId, userId);
    }

    // Update entry visibility
    await pool.execute(
      'UPDATE travel_entries SET is_public = ?, public_slug = ?, featured = ? WHERE id = ?',
      [isPublic, publicSlug, featured, entryId]
    );

    res.json({ 
      message: `Memory ${isPublic ? 'published' : 'made private'} successfully`,
      publicSlug,
      isPublic,
      featured
    });

  } catch (error) {
    console.error('Error updating memory visibility:', error);
    res.status(500).json({ error: 'Failed to update memory visibility' });
  }
});

// Update entry visibility settings (public/private, featured)
router.put('/:id/visibility', async (req, res) => {
  try {
    console.log('=== VISIBILITY UPDATE REQUEST ===');
    console.log('Entry ID:', req.params.id);
    console.log('User ID:', req.user.id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const entryId = req.params.id;
    const userId = req.user.id;
    const { isPublic, featured, publicSlug } = req.body;
    
    // Verify the entry belongs to the user
    const [entry] = await pool.execute(
      'SELECT id FROM travel_entries WHERE id = ? AND user_id = ?',
      [entryId, userId]
    );
    
    console.log('Entry found:', entry.length > 0);
    
    if (entry.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    // Update visibility settings
    const [result] = await pool.execute(
      `UPDATE travel_entries 
       SET is_public = ?, featured = ?, public_slug = ? 
       WHERE id = ? AND user_id = ?`,
      [isPublic ? 1 : 0, featured ? 1 : 0, publicSlug || null, entryId, userId]
    );
    
    console.log('Update result:', result);
    console.log('Affected rows:', result.affectedRows);
    
    res.json({ 
      success: true,
      message: 'Visibility settings updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating entry visibility:', error);
    res.status(500).json({ 
      error: 'Failed to update visibility settings',
      details: error.message 
    });
  }
});

module.exports = router;
