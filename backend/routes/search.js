const express = require('express');
const { query, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Search travel entries
router.get('/', [
  query('q').optional().isLength({ min: 1, max: 200 }).trim(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('latitude').optional().isFloat({ min: -90, max: 90 }),
  query('longitude').optional().isFloat({ min: -180, max: 180 }),
  query('radius').optional().isFloat({ min: 0.1, max: 1000 }), // km
  query('tags').optional(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      q: searchQuery,
      startDate,
      endDate,
      latitude,
      longitude,
      radius,
      tags
    } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let baseQuery = `
      SELECT DISTINCT te.id, te.title, te.description, te.latitude, te.longitude, 
             te.location_name, te.entry_date, te.created_at, te.updated_at
      FROM travel_entries te
    `;

    let whereConditions = ['te.user_id = ?'];
    let queryParams = [req.user.id];
    let joins = [];

    // Text search in title, description, and location name
    if (searchQuery) {
      whereConditions.push(`(
        te.title LIKE ? OR 
        te.description LIKE ? OR 
        te.location_name LIKE ?
      )`);
      const searchPattern = `%${searchQuery}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    // Date range filter
    if (startDate) {
      whereConditions.push('te.entry_date >= ?');
      queryParams.push(startDate);
    }
    if (endDate) {
      whereConditions.push('te.entry_date <= ?');
      queryParams.push(endDate);
    }

    // Location-based search (within radius)
    if (latitude && longitude && radius) {
      whereConditions.push(`(
        6371 * acos(
          cos(radians(?)) * cos(radians(te.latitude)) * 
          cos(radians(te.longitude) - radians(?)) + 
          sin(radians(?)) * sin(radians(te.latitude))
        ) <= ?
      )`);
      queryParams.push(latitude, longitude, latitude, radius);
    }

    // Tag-based search
    if (tags) {
      const tagList = Array.isArray(tags) ? tags : tags.split(',');
      if (tagList.length > 0) {
        joins.push('JOIN entry_tags et ON te.id = et.entry_id');
        whereConditions.push(`et.tag IN (${tagList.map(() => '?').join(', ')})`);
        queryParams.push(...tagList.map(tag => tag.trim().toLowerCase()));
      }
    }

    // Build final query
    const joinClause = joins.length > 0 ? joins.join(' ') : '';
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const searchQueryFinal = `
      ${baseQuery}
      ${joinClause}
      ${whereClause}
      ORDER BY te.entry_date DESC
      LIMIT ? OFFSET ?
    `;

    queryParams.push(limit, offset);

    // Execute search query
    const [entries] = await pool.execute(searchQueryFinal, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT te.id) as total
      FROM travel_entries te
      ${joinClause}
      ${whereClause}
    `;
    const countParams = queryParams.slice(0, -2); // Remove limit and offset
    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    // Get additional data for each entry
    for (let entry of entries) {
      // Get media files
      const [media] = await pool.execute(
        'SELECT id, file_name, original_name, file_type, mime_type FROM media_files WHERE entry_id = ? LIMIT 5',
        [entry.id]
      );
      entry.media = media.map(m => ({
        ...m,
        url: `/api/media/file/${m.file_name}`
      }));

      // Get activity links
      const [links] = await pool.execute(
        'SELECT id, title, url, link_type FROM activity_links WHERE entry_id = ? LIMIT 3',
        [entry.id]
      );
      entry.links = links;

      // Get tags
      const [tagResults] = await pool.execute(
        'SELECT tag FROM entry_tags WHERE entry_id = ?',
        [entry.id]
      );
      entry.tags = tagResults.map(t => t.tag);
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
      },
      searchCriteria: {
        query: searchQuery,
        startDate,
        endDate,
        location: latitude && longitude ? { latitude, longitude, radius } : null,
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(',')) : null
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get popular tags for the user
router.get('/tags', async (req, res) => {
  try {
    const [tags] = await pool.execute(
      `SELECT et.tag, COUNT(*) as count
       FROM entry_tags et
       JOIN travel_entries te ON et.entry_id = te.id
       WHERE te.user_id = ?
       GROUP BY et.tag
       ORDER BY count DESC, et.tag ASC
       LIMIT 50`,
      [req.user.id]
    );

    res.json({ tags });
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// Get location suggestions based on user's entries
router.get('/locations', [
  query('q').optional().isLength({ min: 1, max: 100 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const searchQuery = req.query.q;
    let query = `
      SELECT DISTINCT location_name, latitude, longitude, COUNT(*) as entry_count
      FROM travel_entries
      WHERE user_id = ? AND location_name IS NOT NULL
    `;
    let params = [req.user.id];

    if (searchQuery) {
      query += ' AND location_name LIKE ?';
      params.push(`%${searchQuery}%`);
    }

    query += `
      GROUP BY location_name, latitude, longitude
      ORDER BY entry_count DESC, location_name ASC
      LIMIT 20
    `;

    const [locations] = await pool.execute(query, params);

    res.json({ locations });
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Get search suggestions
router.get('/suggestions', [
  query('q').isLength({ min: 1, max: 100 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const searchQuery = req.query.q;
    const searchPattern = `%${searchQuery}%`;

    // Get title suggestions
    const [titleSuggestions] = await pool.execute(
      `SELECT DISTINCT title
       FROM travel_entries
       WHERE user_id = ? AND title LIKE ?
       ORDER BY title ASC
       LIMIT 5`,
      [req.user.id, searchPattern]
    );

    // Get location suggestions
    const [locationSuggestions] = await pool.execute(
      `SELECT DISTINCT location_name
       FROM travel_entries
       WHERE user_id = ? AND location_name LIKE ? AND location_name IS NOT NULL
       ORDER BY location_name ASC
       LIMIT 5`,
      [req.user.id, searchPattern]
    );

    // Get tag suggestions
    const [tagSuggestions] = await pool.execute(
      `SELECT DISTINCT et.tag
       FROM entry_tags et
       JOIN travel_entries te ON et.entry_id = te.id
       WHERE te.user_id = ? AND et.tag LIKE ?
       ORDER BY et.tag ASC
       LIMIT 5`,
      [req.user.id, searchPattern]
    );

    res.json({
      suggestions: {
        titles: titleSuggestions.map(s => s.title),
        locations: locationSuggestions.map(s => s.location_name),
        tags: tagSuggestions.map(s => s.tag)
      }
    });
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// Advanced search with filters
router.post('/advanced', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const {
      textQuery,
      dateRange,
      locationFilter,
      tags,
      mediaTypes,
      hasLinks
    } = req.body;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let baseQuery = `
      SELECT DISTINCT te.id, te.title, te.description, te.latitude, te.longitude, 
             te.location_name, te.entry_date, te.created_at, te.updated_at
      FROM travel_entries te
    `;

    let whereConditions = ['te.user_id = ?'];
    let queryParams = [req.user.id];
    let joins = [];

    // Text search
    if (textQuery) {
      whereConditions.push(`(
        te.title LIKE ? OR 
        te.description LIKE ? OR 
        te.location_name LIKE ?
      )`);
      const searchPattern = `%${textQuery}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    // Date range
    if (dateRange && dateRange.start) {
      whereConditions.push('te.entry_date >= ?');
      queryParams.push(dateRange.start);
    }
    if (dateRange && dateRange.end) {
      whereConditions.push('te.entry_date <= ?');
      queryParams.push(dateRange.end);
    }

    // Location filter
    if (locationFilter && locationFilter.center && locationFilter.radius) {
      const { center, radius } = locationFilter;
      whereConditions.push(`(
        6371 * acos(
          cos(radians(?)) * cos(radians(te.latitude)) * 
          cos(radians(te.longitude) - radians(?)) + 
          sin(radians(?)) * sin(radians(te.latitude))
        ) <= ?
      )`);
      queryParams.push(center.lat, center.lng, center.lat, radius);
    }

    // Tags filter
    if (tags && tags.length > 0) {
      joins.push('JOIN entry_tags et ON te.id = et.entry_id');
      whereConditions.push(`et.tag IN (${tags.map(() => '?').join(', ')})`);
      queryParams.push(...tags.map(tag => tag.toLowerCase()));
    }

    // Media types filter
    if (mediaTypes && mediaTypes.length > 0) {
      joins.push('JOIN media_files mf ON te.id = mf.entry_id');
      whereConditions.push(`mf.file_type IN (${mediaTypes.map(() => '?').join(', ')})`);
      queryParams.push(...mediaTypes);
    }

    // Has links filter
    if (hasLinks === true) {
      joins.push('JOIN activity_links al ON te.id = al.entry_id');
    } else if (hasLinks === false) {
      joins.push('LEFT JOIN activity_links al ON te.id = al.entry_id');
      whereConditions.push('al.id IS NULL');
    }

    // Build and execute query
    const joinClause = [...new Set(joins)].join(' '); // Remove duplicates
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const searchQueryFinal = `
      ${baseQuery}
      ${joinClause}
      ${whereClause}
      ORDER BY te.entry_date DESC
      LIMIT ? OFFSET ?
    `;

    queryParams.push(limit, offset);

    const [entries] = await pool.execute(searchQueryFinal, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT te.id) as total
      FROM travel_entries te
      ${joinClause}
      ${whereClause}
    `;
    const countParams = queryParams.slice(0, -2);
    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    // Enhance entries with additional data
    for (let entry of entries) {
      const [media] = await pool.execute(
        'SELECT id, file_name, file_type FROM media_files WHERE entry_id = ? LIMIT 3',
        [entry.id]
      );
      entry.mediaPreview = media;

      const [tagResults] = await pool.execute(
        'SELECT tag FROM entry_tags WHERE entry_id = ?',
        [entry.id]
      );
      entry.tags = tagResults.map(t => t.tag);
    }

    res.json({
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({ error: 'Advanced search failed' });
  }
});

module.exports = router;
