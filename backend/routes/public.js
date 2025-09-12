const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const path = require('path');
const fs = require('fs');

// Public badge icon endpoint
router.get('/badge-icon/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Set proper CORS headers first
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Expose-Headers': 'Content-Type, Content-Length',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    });
    
    // Serve badge icon from public directory without authentication
    const publicBadgePath = path.join(__dirname, '../uploads/public-badges', filename);
    
    if (!fs.existsSync(publicBadgePath)) {
      return res.status(404).json({ error: 'Badge icon not found' });
    }

    // Determine content type
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg', 
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };

    const contentType = contentTypes[ext] || 'image/png';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours cache

    // Stream the file directly
    const readStream = fs.createReadStream(publicBadgePath);
    readStream.pipe(res);
    
  } catch (error) {
    console.error('Error serving public badge icon:', error);
    res.status(500).json({ error: 'Failed to serve badge icon' });
  }
});

// Fallback media endpoint for production (in case static files don't work)
router.get('/media/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Check if this filename is an original file OR thumbnail in a public memory
    const [mediaFiles] = await pool.execute(`
      SELECT mf.*, te.is_public, u.profile_public
      FROM media_files mf
      JOIN travel_entries te ON mf.entry_id = te.id  
      JOIN users u ON te.user_id = u.id
      WHERE (mf.file_name = ? OR mf.thumbnail_path = ?) 
      AND te.is_public = 1 AND u.profile_public = 1
    `, [filename, filename]);
    
    if (mediaFiles.length === 0) {
      return res.status(404).json({ error: 'Media file not found or not public' });
    }
    
    // Serve the requested file with CORS headers
    const filePath = path.join(__dirname, '../uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }
    
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    
    res.sendFile(filePath);
    
  } catch (error) {
    console.error('Error serving public media:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get public user profile
router.get('/users/:username', async (req, res) => {
router.get('/users/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    // Decode the username in case it contains URL-encoded characters (like @ in emails)
    const decodedUsername = decodeURIComponent(username);
    
    console.log('Looking for public profile for username:', decodedUsername);
    
    // Get user's public profile data
    const [users] = await pool.execute(`
      SELECT 
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        u.profile_bio,
        u.avatar_filename,
        u.hero_image_filename,
        u.public_username,
        u.created_at
      FROM users u
      WHERE (u.username = ? OR u.public_username = ?) AND u.profile_public = 1
    `, [decodedUsername, decodedUsername]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found or profile is private' });
    }

    const user = users[0];

    // Get public memory stats
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_memories,
        COUNT(CASE WHEN featured = 1 THEN 1 END) as featured_memories,
        MIN(entry_date) as earliest_memory,
        MAX(entry_date) as latest_memory
      FROM travel_entries 
      WHERE user_id = ? AND is_public = 1
    `, [user.id]);

    // Get featured public memories
    const [featuredMemories] = await pool.execute(`
      SELECT 
        te.id,
        te.title,
        te.public_slug,
        te.entry_date,
        te.location_name,
        te.latitude,
        te.longitude,
        te.is_dog_friendly,
        (SELECT mf.file_name 
         FROM media_files mf 
         WHERE mf.entry_id = te.id 
         AND mf.file_type = 'image' 
         LIMIT 1) as thumbnail
      FROM travel_entries te
      WHERE te.user_id = ? AND te.is_public = 1 AND te.featured = 1
      ORDER BY te.entry_date DESC
      LIMIT 6
    `, [user.id]);

    // Convert boolean fields for featured memories
    featuredMemories.forEach(memory => {
      memory.isDogFriendly = !!memory.is_dog_friendly;
      delete memory.is_dog_friendly; // Remove the database field name
    });

    res.json({
      user: {
        username: user.username,
        publicUsername: user.public_username,
        firstName: user.first_name,
        lastName: user.last_name,
        profileBio: user.profile_bio,
        avatarUrl: user.avatar_filename ? `${process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? 'https://fojourn.site' : 'http://localhost:3001')}/public/avatars/${user.avatar_filename}` : null,
        heroImageUrl: user.hero_image_filename ? `${process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? 'https://fojourn.site' : 'http://localhost:3001')}/api/auth/hero-image/${user.hero_image_filename}` : null,
        memberSince: user.created_at
      },
      stats: stats[0],
      featuredMemories
    });

  } catch (error) {
    console.error('Error fetching public profile:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Debug endpoint to check user data
router.get('/debug/users/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const decodedUsername = decodeURIComponent(username);
    
    console.log('Debug: Looking for user:', decodedUsername);
    
    // Get user data (including private users for debugging)
    const [users] = await pool.execute(`
      SELECT 
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        u.profile_bio,
        u.profile_public,
        u.avatar_filename,
        u.created_at
      FROM users u
      WHERE u.username = ?
    `, [decodedUsername]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get public memories for a user
router.get('/users/:username/memories', async (req, res) => {
  try {
    const { username } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    // Decode the username in case it contains URL-encoded characters
    const decodedUsername = decodeURIComponent(username);
    
    console.log('Looking for public memories for username:', decodedUsername);

    // Get user ID
    const [users] = await pool.execute(`
      SELECT id FROM users 
      WHERE (username = ? OR public_username = ?) AND profile_public = 1
    `, [decodedUsername, decodedUsername]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found or profile is private' });
    }

    const userId = users[0].id;

    console.log('Debug query params:', { userId, limit, offset, types: [typeof userId, typeof limit, typeof offset] });

    // Get public memories - support randomization
    const randomize = req.query.random === 'true';
    const orderBy = randomize ? 'RAND()' : 'te.entry_date DESC';
    
    const [memories] = await pool.execute(`
      SELECT 
        te.id,
        te.title,
        te.description,
        te.public_slug,
        te.entry_date,
        te.location_name,
        te.latitude,
        te.longitude,
        te.featured,
        te.is_dog_friendly
      FROM travel_entries te
      WHERE te.user_id = ? AND te.is_public = 1
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${offset}
    `, [userId]);

    // Convert boolean fields for memories
    memories.forEach(memory => {
      memory.isDogFriendly = !!memory.is_dog_friendly;
      memory.featured = !!memory.featured;
      delete memory.is_dog_friendly; // Remove the database field name
    });

    // Get total count for pagination
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total 
      FROM travel_entries 
      WHERE user_id = ? AND is_public = 1
    `, [userId]);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      memories,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching public memories:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get ALL public memories for map display (no pagination)
router.get('/users/:username/map-memories', async (req, res) => {
  try {
    const { username } = req.params;
    
    // Decode the username in case it contains URL-encoded characters
    const decodedUsername = decodeURIComponent(username);
    
    console.log('Looking for all map memories for username:', decodedUsername);
    
    // Get user ID first
    const [users] = await pool.execute(`
      SELECT id FROM users 
      WHERE (username = ? OR public_username = ?) AND profile_public = 1
    `, [decodedUsername, decodedUsername]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'Public user not found' });
    }

    const userId = users[0].id;

    // Get ALL public memories with location data for map
    const [memories] = await pool.execute(`
      SELECT 
        te.id,
        te.title,
        te.public_slug,
        te.entry_date,
        te.location_name,
        te.latitude,
        te.longitude,
        te.featured,
        te.is_dog_friendly
      FROM travel_entries te
      WHERE te.user_id = ? AND te.is_public = 1 
      AND te.latitude IS NOT NULL AND te.longitude IS NOT NULL
      ORDER BY te.entry_date DESC
    `, [userId]);

    // Convert boolean fields
    memories.forEach(memory => {
      memory.isDogFriendly = !!memory.is_dog_friendly;
      memory.featured = !!memory.featured;
      delete memory.is_dog_friendly;
    });

    res.json({
      memories,
      total: memories.length
    });

  } catch (error) {
    console.error('Error fetching map memories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get individual public memory by slug
router.get('/memories/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    // Get memory with user info
    const [memories] = await pool.execute(`
      SELECT 
        te.*,
        u.username,
        u.public_username,
        u.first_name,
        u.last_name,
        u.avatar_filename
      FROM travel_entries te
      JOIN users u ON te.user_id = u.id
      WHERE te.public_slug = ? AND te.is_public = 1 AND u.profile_public = 1
    `, [slug]);

    if (memories.length === 0) {
      return res.status(404).json({ error: 'Memory not found or is private' });
    }

    const memory = memories[0];

    // Get public media for this memory
    const [media] = await pool.execute(`
      SELECT 
        file_name,
        original_name,
        file_type,
        file_size,
        thumbnail_path
      FROM media_files 
      WHERE entry_id = ?
      ORDER BY uploaded_at
    `, [memory.id]);

    // Add public URLs to media files
    memory.media = media.map(file => {
      // Use API endpoint for production, static files for development
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? `${process.env.BACKEND_URL || 'https://fojourn.site'}/api/public/media/`
        : `${process.env.BACKEND_URL || 'http://localhost:3001'}/public/media/`;
      
      let thumbnailUrl = undefined;
      // Generate thumbnail URL if thumbnail exists
      if (file.thumbnail_path && file.thumbnail_path.trim() !== '') {
        const thumbnailFileName = require('path').basename(file.thumbnail_path);
        thumbnailUrl = `${baseUrl}${thumbnailFileName}`;
      }
      
      return {
        ...file,
        url: `${baseUrl}${file.file_name}`,
        thumbnailUrl: thumbnailUrl
      };
    });

    // Convert boolean fields
    memory.isDogFriendly = !!memory.is_dog_friendly;
    memory.isPublic = !!memory.is_public;
    memory.featured = !!memory.featured;

    memory.author = {
      username: memory.username,
      publicUsername: memory.public_username,
      firstName: memory.first_name,
      lastName: memory.last_name,
      avatarUrl: memory.avatar_filename ? `${process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? 'https://fojourn.site' : 'http://localhost:3001')}/public/avatars/${memory.avatar_filename}` : null
    };

    // Remove sensitive data
    delete memory.user_id;
    delete memory.username;
    delete memory.first_name;
    delete memory.last_name;
    delete memory.avatar_filename;
    delete memory.is_dog_friendly; // Remove database field name
    delete memory.is_public; // Remove database field name

    res.json(memory);

  } catch (error) {
    console.error('Error fetching public memory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get public user badges
router.get('/users/:username/badges', async (req, res) => {
  try {
    const { username } = req.params;
    const decodedUsername = decodeURIComponent(username);
    
    console.log('Looking for public badges for username:', decodedUsername);
    
    // First get the user ID and verify profile is public
    const [users] = await pool.execute(`
      SELECT id, profile_public 
      FROM users 
      WHERE (username = ? OR public_username = ?) AND profile_public = 1
    `, [decodedUsername, decodedUsername]);

    console.log('Found users:', users);

    if (users.length === 0) {
      console.log('No public user found with username:', decodedUsername);
      return res.status(404).json({ error: 'User not found or profile is private' });
    }

    const userId = users[0].id;
    console.log('User ID found:', userId);

    // Get user's earned badges
    const [badges] = await pool.execute(`
      SELECT 
        b.id,
        b.name,
        b.description,
        b.icon_url,
        b.badge_type as type,
        b.points,
        b.criteria_value as requirement_value,
        b.criteria_type,
        ub.earned_at
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = ?
      ORDER BY ub.earned_at DESC
    `, [userId]);

    console.log('Found badges:', badges.length);

    res.json({
      badges: badges.map(badge => ({
        ...badge,
        // Convert private icon_url to public icon_url using static route
        icon_url: badge.icon_url ? badge.icon_url.replace('/badges/', '/public/badge-icons/') : null,
        icon: badge.icon_url ? badge.icon_url.replace('/badges/', '/public/badge-icons/') : null, // Add icon field for compatibility
        awarded_at: badge.earned_at // Match the expected field name from the component
      }))
    });

  } catch (error) {
    console.error('Error fetching public badges:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

module.exports = router;
