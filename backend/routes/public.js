const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const path = require('path');
const fs = require('fs');

// Public media endpoint for verified public memory images
router.get('/media/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Verify this file belongs to a public memory
    const [mediaFiles] = await pool.execute(`
      SELECT mf.*, te.is_public, u.profile_public
      FROM media_files mf
      JOIN travel_entries te ON mf.entry_id = te.id  
      JOIN users u ON te.user_id = u.id
      WHERE mf.file_name = ? AND te.is_public = 1 AND u.profile_public = 1
    `, [filename]);
    
    if (mediaFiles.length === 0) {
      return res.status(404).json({ error: 'Media file not found or not public' });
    }
    
    // Serve the file with CORS headers
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
        u.created_at
      FROM users u
      WHERE u.username = ? AND u.profile_public = 1
    `, [decodedUsername]);

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

    res.json({
      user: {
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        profileBio: user.profile_bio,
        avatarUrl: user.avatar_filename ? `${process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? 'https://fojourn.site' : 'http://localhost:3001')}/public/avatars/${user.avatar_filename}` : null,
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
      WHERE username = ? AND profile_public = 1
    `, [decodedUsername]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found or profile is private' });
    }

    const userId = users[0].id;

    console.log('Debug query params:', { userId, limit, offset, types: [typeof userId, typeof limit, typeof offset] });

    // Get public memories - hardcode limit/offset to avoid parameter binding issues
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
        te.featured
      FROM travel_entries te
      WHERE te.user_id = ? AND te.is_public = 1
      ORDER BY te.entry_date DESC
      LIMIT ${limit} OFFSET ${offset}
    `, [userId]);

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

// Get individual public memory by slug
router.get('/memories/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    // Get memory with user info
    const [memories] = await pool.execute(`
      SELECT 
        te.*,
        u.username,
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
        file_size
      FROM media_files 
      WHERE entry_id = ?
      ORDER BY uploaded_at
    `, [memory.id]);

    // Add public URLs to media files
    memory.media = media.map(file => ({
      ...file,
      url: `${process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? 'https://fojourn.site' : 'http://localhost:3001')}/public/users/${memory.user_id}/memories/${memory.id}/${file.file_name}`
    }));

    memory.author = {
      username: memory.username,
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

    res.json(memory);

  } catch (error) {
    console.error('Error fetching public memory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
