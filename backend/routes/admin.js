const express = require('express');
const { pool } = require('../config/database');
const { retroactivelyCopyPublicFiles } = require('../retroactive-copy-public-files');
const { authenticateToken } = require('../middleware/auth');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

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

// Dashboard stats
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get user statistics
    const [userStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_users_30d,
        COUNT(CASE WHEN profile_public = true THEN 1 END) as public_profiles
      FROM users
    `);

    // Get travel entries statistics
    const [entryStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_entries,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_entries_30d,
        COUNT(CASE WHEN is_public = true THEN 1 END) as public_entries
      FROM travel_entries
    `);

    // Get media statistics
    const [mediaStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_files,
        SUM(file_size) as total_size
      FROM media_files
    `);

    // Get recent activity
    const [recentEntries] = await pool.execute(`
      SELECT 
        te.id,
        te.title,
        te.created_at,
        u.username,
        u.email,
        te.is_public
      FROM travel_entries te
      JOIN users u ON te.user_id = u.id
      ORDER BY te.created_at DESC
      LIMIT 10
    `);

    res.json({
      stats: {
        users: userStats[0],
        entries: entryStats[0],
        media: mediaStats[0]
      },
      recentActivity: recentEntries
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Get all users with pagination
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let query = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        u.profile_public,
        u.is_admin,
        u.created_at,
        u.avatar_filename,
        COUNT(te.id) as entry_count,
        MAX(te.created_at) as last_entry
      FROM users u
      LEFT JOIN travel_entries te ON u.id = te.user_id
    `;

    const params = [];
    
    if (search) {
      query += ` WHERE u.username LIKE ? OR u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    query += ` GROUP BY u.id ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const [users] = await pool.execute(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM users';
    const countParams = [];
    
    if (search) {
      countQuery += ` WHERE username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?`;
      const searchParam = `%${search}%`;
      countParams.push(searchParam, searchParam, searchParam, searchParam);
    }

    const [countResult] = await pool.execute(countQuery, countParams);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Users list error:', error);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

// Get user details
router.get('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Get user info
    const [users] = await pool.execute(`
      SELECT 
        id, username, email, first_name, last_name, 
        profile_bio, profile_public, public_username,
        avatar_filename, is_admin, created_at
      FROM users 
      WHERE id = ?
    `, [userId]);

    if (!users.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's entries
    const [entries] = await pool.execute(`
      SELECT 
        id, title, location_name, entry_date, is_public, created_at
      FROM travel_entries 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `, [userId]);

    // Get user's media count
    const [mediaCount] = await pool.execute(`
      SELECT COUNT(*) as count, SUM(file_size) as total_size
      FROM media_files mf
      JOIN travel_entries te ON mf.entry_id = te.id
      WHERE te.user_id = ?
    `, [userId]);

    res.json({
      user: users[0],
      entries,
      mediaStats: mediaCount[0]
    });
  } catch (error) {
    console.error('User details error:', error);
    res.status(500).json({ error: 'Failed to load user details' });
  }
});

// Update user admin status
router.put('/users/:id/admin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { isAdmin } = req.body;

    // Prevent removing admin from the last admin
    if (!isAdmin) {
      const [adminCount] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE is_admin = true');
      if (adminCount[0].count <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last admin user' });
      }
    }

    await pool.execute(
      'UPDATE users SET is_admin = ? WHERE id = ?',
      [isAdmin, userId]
    );

    res.json({ message: 'User admin status updated successfully' });
  } catch (error) {
    console.error('Update admin status error:', error);
    res.status(500).json({ error: 'Failed to update user admin status' });
  }
});

// Get content for moderation
router.get('/content', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const type = req.query.type || 'all'; // 'entries', 'public_profiles', 'all'
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let results = {};

    if (type === 'entries' || type === 'all') {
      // Get public travel entries
      const [publicEntries] = await pool.execute(`
        SELECT 
          te.id,
          te.title,
          te.location_name,
          te.description,
          te.entry_date,
          te.created_at,
          te.is_public,
          u.username,
          u.email,
          COUNT(mf.id) as media_count
        FROM travel_entries te
        JOIN users u ON te.user_id = u.id
        LEFT JOIN media_files mf ON te.id = mf.entry_id
        GROUP BY te.id, te.title, te.location_name, te.description, te.entry_date, te.created_at, te.is_public, u.username, u.email
        ORDER BY te.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);

      results.publicEntries = publicEntries;
    }

    if (type === 'public_profiles' || type === 'all') {
      // Get public profiles
      const [publicProfiles] = await pool.execute(`
        SELECT 
          id,
          username,
          email,
          first_name,
          last_name,
          created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);

      results.publicProfiles = publicProfiles;
    }

    res.json(results);
  } catch (error) {
    console.error('Content moderation error:', error);
    res.status(500).json({ error: 'Failed to load content' });
  }
});

// System maintenance
router.get('/maintenance/storage', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get storage usage by directory
    const uploadsPath = path.join(__dirname, '../uploads');
    const avatarsPath = path.join(uploadsPath, 'avatars');
    
    const getDirectorySize = async (dirPath) => {
      try {
        const files = await fs.readdir(dirPath);
        let totalSize = 0;
        let fileCount = 0;

        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const stats = await fs.stat(filePath);
          if (stats.isFile()) {
            totalSize += stats.size;
            fileCount++;
          }
        }

        return { totalSize, fileCount };
      } catch (error) {
        return { totalSize: 0, fileCount: 0 };
      }
    };

    const [uploadsStats, avatarsStats] = await Promise.all([
      getDirectorySize(uploadsPath),
      getDirectorySize(avatarsPath)
    ]);

    // Get database storage info
    const [dbStats] = await pool.execute(`
      SELECT 
        table_name,
        ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
      FROM information_schema.TABLES 
      WHERE table_schema = DATABASE()
      ORDER BY (data_length + index_length) DESC
    `);

    res.json({
      filesystem: {
        uploads: uploadsStats,
        avatars: avatarsStats
      },
      database: dbStats
    });
  } catch (error) {
    console.error('Storage info error:', error);
    res.status(500).json({ error: 'Failed to get storage info' });
  }
});

// Admin-only endpoint to retroactively copy public files
router.post('/copy-public-files', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // For security, only allow admin users (you can add admin check here)
    // For now, just check if user is authenticated
    
    console.log('Starting retroactive copy of public files triggered by API...');
    
    // Run the retroactive copy process
    await retroactivelyCopyPublicFiles();
    
    res.json({ 
      success: true, 
      message: 'Retroactive file copying completed successfully' 
    });
    
  } catch (error) {
    console.error('Error in retroactive copy API:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to copy public files',
      details: error.message 
    });
  }
});

// Content moderation actions
// Toggle entry visibility
router.put('/entries/:entryId/visibility', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { entryId } = req.params;
    const { isPublic } = req.body;

    const [result] = await pool.execute(
      'UPDATE travel_entries SET is_public = ? WHERE id = ?',
      [isPublic, entryId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json({ 
      success: true, 
      message: `Entry ${isPublic ? 'made public' : 'hidden from public'}` 
    });
  } catch (error) {
    console.error('Error updating entry visibility:', error);
    res.status(500).json({ error: 'Failed to update entry visibility' });
  }
});

// Flag/unflag user profile
router.put('/users/:userId/flag', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { isFlagged, reason } = req.body;

    // Add or update user flag status
    const [result] = await pool.execute(
      'UPDATE users SET is_flagged = ?, flag_reason = ? WHERE id = ?',
      [isFlagged, reason || null, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      success: true, 
      message: `User ${isFlagged ? 'flagged' : 'unflagged'} successfully` 
    });
  } catch (error) {
    console.error('Error updating user flag status:', error);
    res.status(500).json({ error: 'Failed to update user flag status' });
  }
});

// Get entry details for moderation
router.get('/entries/:entryId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { entryId } = req.params;

    const [entryResult] = await pool.execute(`
      SELECT 
        te.*,
        u.username,
        u.email,
        COUNT(mf.id) as media_count
      FROM travel_entries te
      JOIN users u ON te.user_id = u.id
      LEFT JOIN media_files mf ON te.id = mf.entry_id
      WHERE te.id = ?
      GROUP BY te.id
    `, [entryId]);

    if (entryResult.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // Get media files for this entry
    const [mediaResult] = await pool.execute(
      `SELECT 
        id,
        file_name as fileName,
        original_name as originalName,
        file_type as fileType,
        file_size as fileSize,
        mime_type as mimeType,
        thumbnail_path as thumbnailPath,
        uploaded_at as uploadedAt
       FROM media_files 
       WHERE entry_id = ?`,
      [entryId]
    );

    // Add URLs to media files
    const token = req.headers.authorization?.replace('Bearer ', '');
    const baseUrl = `${process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? 'https://fojourn.site' : 'http://localhost:3001')}/api/media/file/`;
    
    const mediaWithUrls = mediaResult.map(file => {
      let thumbnailUrl = undefined;
      
      console.log('Processing file:', file.fileName, 'thumbnail_path:', file.thumbnailPath);
      
      // Only generate thumbnailUrl if thumbnailPath exists and is not empty
      if (file.thumbnailPath && file.thumbnailPath.trim() !== '') {
        const path = require('path');
        const thumbnailFileName = path.basename(file.thumbnailPath);
        thumbnailUrl = `${baseUrl}${thumbnailFileName}?token=${token}`;
        console.log('Generated thumbnail URL:', thumbnailUrl);
      } else {
        console.log('No thumbnail path found for file:', file.fileName);
      }
      
      return {
        ...file,
        url: `${baseUrl}${file.fileName}?token=${token}`,
        thumbnailUrl: thumbnailUrl
      };
    });

    res.json({
      entry: entryResult[0],
      media: mediaWithUrls
    });
  } catch (error) {
    console.error('Error fetching entry details:', error);
    res.status(500).json({ error: 'Failed to fetch entry details' });
  }
});

// ============ MAINTENANCE ENDPOINTS ============

// Get system health status
router.get('/maintenance/health', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const health = {
      database: { status: 'unknown', details: '' },
      fileSystem: { status: 'unknown', details: '' },
      uploads: { status: 'unknown', details: '' }
    };

    // Check database connection
    try {
      await pool.execute('SELECT 1');
      health.database.status = 'healthy';
      health.database.details = 'Database connection successful';
    } catch (dbError) {
      health.database.status = 'error';
      health.database.details = `Database error: ${dbError.message}`;
    }

    // Check uploads directory
    try {
      const uploadsPath = path.join(__dirname, '../uploads');
      await fs.access(uploadsPath);
      const stats = await fs.stat(uploadsPath);
      health.uploads.status = 'healthy';
      health.uploads.details = `Uploads directory accessible (created: ${stats.birthtime.toISOString()})`;
    } catch (fsError) {
      health.uploads.status = 'error';
      health.uploads.details = `Uploads directory error: ${fsError.message}`;
    }

    // Check file system write permissions
    try {
      const testFile = path.join(__dirname, '../uploads/test-write.tmp');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      health.fileSystem.status = 'healthy';
      health.fileSystem.details = 'File system write permissions OK';
    } catch (writeError) {
      health.fileSystem.status = 'error';
      health.fileSystem.details = `File system write error: ${writeError.message}`;
    }

    res.json(health);
  } catch (error) {
    console.error('Error checking system health:', error);
    res.status(500).json({ error: 'Failed to check system health' });
  }
});

// Get orphaned media files
router.get('/maintenance/orphaned-media', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Find media files in database that don't exist on disk
    const [dbFiles] = await pool.execute(`
      SELECT id, file_name, file_path, entry_id, thumbnail_path 
      FROM media_files 
      ORDER BY id DESC
    `);

    const orphanedFiles = [];
    const missingFiles = [];

    for (const file of dbFiles) {
      try {
        // Check if main file exists
        if (file.file_path) {
          try {
            await fs.access(file.file_path);
          } catch {
            missingFiles.push({
              ...file,
              issue: 'Missing main file',
              path: file.file_path
            });
          }
        }

        // Check if thumbnail exists (if specified)
        if (file.thumbnail_path) {
          const thumbnailFullPath = path.join(path.dirname(file.file_path), file.thumbnail_path);
          try {
            await fs.access(thumbnailFullPath);
          } catch {
            missingFiles.push({
              ...file,
              issue: 'Missing thumbnail file',
              path: thumbnailFullPath
            });
          }
        }
      } catch (error) {
        console.warn(`Error checking file ${file.file_name}:`, error.message);
      }
    }

    // Find files on disk that aren't in database
    try {
      const uploadsPath = path.join(__dirname, '../uploads');
      const diskFiles = await fs.readdir(uploadsPath);
      
      for (const diskFile of diskFiles) {
        if (diskFile.startsWith('.') || diskFile === 'test-write.tmp') continue;
        
        const dbFile = dbFiles.find(f => f.file_name === diskFile || f.thumbnail_path === diskFile);
        if (!dbFile) {
          const filePath = path.join(uploadsPath, diskFile);
          const stats = await fs.stat(filePath);
          orphanedFiles.push({
            fileName: diskFile,
            path: filePath,
            size: stats.size,
            created: stats.birthtime,
            issue: 'File exists on disk but not in database'
          });
        }
      }
    } catch (error) {
      console.warn('Error scanning disk files:', error.message);
    }

    res.json({
      orphanedFiles,
      missingFiles,
      summary: {
        orphanedCount: orphanedFiles.length,
        missingCount: missingFiles.length,
        totalIssues: orphanedFiles.length + missingFiles.length
      }
    });
  } catch (error) {
    console.error('Error finding orphaned media:', error);
    res.status(500).json({ error: 'Failed to find orphaned media' });
  }
});

// Clean up orphaned files
router.post('/maintenance/cleanup-orphaned', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { orphanedFiles } = req.body;
    
    if (!orphanedFiles || !Array.isArray(orphanedFiles)) {
      return res.status(400).json({ error: 'Invalid orphaned files list' });
    }

    const results = {
      deleted: [],
      errors: []
    };

    for (const file of orphanedFiles) {
      try {
        await fs.unlink(file.path);
        results.deleted.push(file.fileName);
      } catch (error) {
        results.errors.push({
          fileName: file.fileName,
          error: error.message
        });
      }
    }

    res.json({
      message: `Cleanup completed: ${results.deleted.length} files deleted, ${results.errors.length} errors`,
      results
    });
  } catch (error) {
    console.error('Error cleaning orphaned files:', error);
    res.status(500).json({ error: 'Failed to clean orphaned files' });
  }
});

// Get database statistics
router.get('/maintenance/database-stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = {};

    // Table row counts
    const tables = ['users', 'travel_entries', 'media_files', 'entry_tags', 'activity_links'];
    
    for (const table of tables) {
      try {
        const [result] = await pool.execute(`SELECT COUNT(*) as count FROM ${table}`);
        stats[table] = result[0].count;
      } catch (error) {
        stats[table] = `Error: ${error.message}`;
      }
    }

    // Database size (MySQL specific)
    try {
      const [sizeResult] = await pool.execute(`
        SELECT 
          table_schema as 'Database',
          ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as 'Size_MB'
        FROM information_schema.tables 
        WHERE table_schema = ?
        GROUP BY table_schema
      `, [process.env.DB_NAME]);
      
      stats.database_size_mb = sizeResult[0]?.Size_MB || 'Unknown';
    } catch (error) {
      stats.database_size_mb = `Error: ${error.message}`;
    }

    // Recent activity
    try {
      const [recentEntries] = await pool.execute(`
        SELECT COUNT(*) as count 
        FROM travel_entries 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      `);
      stats.recent_entries_7d = recentEntries[0].count;

      const [recentUsers] = await pool.execute(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      `);
      stats.recent_users_7d = recentUsers[0].count;
    } catch (error) {
      stats.recent_activity_error = error.message;
    }

    res.json(stats);
  } catch (error) {
    console.error('Error getting database stats:', error);
    res.status(500).json({ error: 'Failed to get database stats' });
  }
});

// Generate missing thumbnails
router.post('/maintenance/generate-thumbnails', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // This endpoint will trigger thumbnail generation for images without thumbnails
    // We can reuse our existing generate-missing-thumbnails logic
    
    const [imageFiles] = await pool.execute(`
      SELECT id, file_name, file_path, file_type, mime_type
      FROM media_files 
      WHERE file_type = 'image' 
      AND (thumbnail_path IS NULL OR thumbnail_path = '')
      LIMIT 50
    `);

    res.json({
      message: `Found ${imageFiles.length} images without thumbnails`,
      filesFound: imageFiles.length,
      note: 'Use the thumbnail generation script for bulk processing'
    });
  } catch (error) {
    console.error('Error checking thumbnail status:', error);
    res.status(500).json({ error: 'Failed to check thumbnail status' });
  }
});

module.exports = router;
