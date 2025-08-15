const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { generateVideoThumbnail, getThumbnailFileName, isVideoFile } = require('../utils/videoUtils');

const router = express.Router();

// Serve uploaded files (public access with token validation) - BEFORE auth middleware
router.get('/file/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
    
    console.log('Media file request:', filename);
    console.log('Token provided:', !!token);
    
    // If no token provided, try to serve publicly (for now, we'll validate ownership later)
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify token
    let userId;
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.userId || decoded.id; // Support both formats
      console.log('Token decoded, userId:', userId);
    } catch (err) {
      console.log('Token verification failed:', err.message);
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Check if this is a thumbnail file request
    const isThumbRequest = filename.includes('_thumb.');
    
    if (isThumbRequest) {
      // For thumbnail files, find the original video file in the database
      // Extract base filename without _thumb suffix
      const thumbMatch = filename.match(/^(.+)_thumb\.(jpg|jpeg|png)$/i);
      if (!thumbMatch) {
        console.log('Invalid thumbnail filename format:', filename);
        return res.status(400).json({ error: 'Invalid thumbnail filename' });
      }
      
      const baseFilename = thumbMatch[1];
      console.log('Thumbnail request for:', filename, 'Base filename:', baseFilename);
      
      // Find any video file with this base name
      const [files] = await pool.execute(
        `SELECT mf.*, te.user_id 
         FROM media_files mf 
         JOIN travel_entries te ON mf.entry_id = te.id 
         WHERE mf.file_name LIKE ? AND mf.thumbnail_path = ?`,
        [`${baseFilename}.%`, filename]
      );

      console.log('Database query result for thumbnail:', files.length, 'records found');

      if (files.length === 0) {
        console.log('Thumbnail file not found in database for base filename:', baseFilename);
        return res.status(404).json({ error: 'Thumbnail not found' });
      }

      const file = files[0];
      console.log('Thumbnail found for video, owner userId:', file.user_id, 'requesting userId:', userId);

      // Check if user owns the original file
      if (file.user_id !== userId) {
        console.log('Access denied - user does not own original video file');
        return res.status(403).json({ error: 'Access denied' });
      }

      const filePath = path.join(__dirname, '../uploads', filename);
      
      // Check if thumbnail file exists on disk
      try {
        await fs.access(filePath);
        console.log('Thumbnail file exists on disk, serving...');
      } catch {
        console.log('Thumbnail file not found on disk:', filePath);
        return res.status(404).json({ error: 'Thumbnail file not found on disk' });
      }

      // Set appropriate headers for thumbnail (assume JPEG)
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      
      // Add CORS and CORP headers
      res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      
      res.sendFile(path.resolve(filePath));
      return;
    }
    
    // Get file info from database for regular files
    const [files] = await pool.execute(
      `SELECT mf.*, te.user_id 
       FROM media_files mf 
       JOIN travel_entries te ON mf.entry_id = te.id 
       WHERE mf.file_name = ?`,
      [filename]
    );

    if (files.length === 0) {
      console.log('File not found in database:', filename);
      return res.status(404).json({ error: 'File not found' });
    }

    const file = files[0];
    console.log('File found, owner userId:', file.user_id, 'requesting userId:', userId);

    // Check if user owns the file
    if (file.user_id !== userId) {
      console.log('Access denied - user does not own file');
      return res.status(403).json({ error: 'Access denied' });
    }

    const filePath = path.join(__dirname, '../uploads', filename);
    
    // Check if file exists on disk
    try {
      await fs.access(filePath);
      console.log('File exists on disk, serving...');
    } catch {
      console.log('File not found on disk:', filePath);
      return res.status(404).json({ error: 'File not found on disk' });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Length', file.file_size);
    res.setHeader('Content-Disposition', `inline; filename="${file.original_name}"`);
    
    // Add CORS and CORP headers to allow cross-origin access
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    res.sendFile(filePath);
  } catch (error) {
    console.error('File serve error:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

// Debug endpoint to check file existence
router.get('/debug/files', authenticateToken, async (req, res) => {
  try {
    // Get all media files for the user
    const [files] = await pool.execute(
      `SELECT mf.file_name, mf.original_name, mf.thumbnail_path, te.user_id 
       FROM media_files mf 
       JOIN travel_entries te ON mf.entry_id = te.id 
       WHERE te.user_id = ?`,
      [req.user.id]
    );

    const uploadDir = path.join(__dirname, '../uploads');
    const fileStatus = [];

    for (const file of files) {
      const filePath = path.join(uploadDir, file.file_name);
      let exists = false;
      try {
        await fs.access(filePath);
        exists = true;
      } catch {
        exists = false;
      }

      fileStatus.push({
        fileName: file.file_name,
        originalName: file.original_name,
        thumbnailPath: file.thumbnail_path,
        existsOnDisk: exists,
        fullPath: filePath
      });
    }

    res.json({ files: fileStatus });
  } catch (error) {
    console.error('Debug files error:', error);
    res.status(500).json({ error: 'Failed to check files' });
  }
});

// All routes below require authentication
router.use(authenticateToken);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow images and videos
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/mov', 'video/avi', 'video/wmv'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

// Upload media files for a travel entry
router.post('/upload/:entryId', upload.array('files', 10), async (req, res) => {
  try {
    const entryId = parseInt(req.params.entryId);
    
    // Verify entry exists and belongs to user
    const [entries] = await pool.execute(
      'SELECT id FROM travel_entries WHERE id = ? AND user_id = ?',
      [entryId, req.user.id]
    );

    if (entries.length === 0) {
      // Clean up uploaded files
      if (req.files) {
        for (const file of req.files) {
          await fs.unlink(file.path).catch(console.error);
        }
      }
      return res.status(404).json({ error: 'Entry not found' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      // Determine file type
      let fileType = 'document';
      if (file.mimetype.startsWith('image/')) {
        fileType = 'image';
      } else if (file.mimetype.startsWith('video/')) {
        fileType = 'video';
      }

      let thumbnailPath = null;
      let thumbnailFileName = null;

      // Generate thumbnail for video files
      if (fileType === 'video') {
        try {
          thumbnailFileName = getThumbnailFileName(file.filename);
          thumbnailPath = path.join(path.dirname(file.path), thumbnailFileName);
          
          await generateVideoThumbnail(file.path, thumbnailPath, {
            timeOffset: 1,
            width: 320,
            height: 180,
            quality: 2
          });
          
          console.log(`Video thumbnail generated: ${thumbnailPath}`);
          // Store just the filename, not the full path
          thumbnailPath = thumbnailFileName;
        } catch (error) {
          console.warn(`Failed to generate thumbnail for ${file.filename}:`, error);
          // Continue without thumbnail if generation fails
          thumbnailPath = null;
        }
      }

      // Save file metadata to database
      const [result] = await pool.execute(
        'INSERT INTO media_files (entry_id, file_name, original_name, file_path, file_type, file_size, mime_type, thumbnail_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [entryId, file.filename, file.originalname, file.path, fileType, file.size, file.mimetype, thumbnailPath]
      );

      // Get the JWT token from the request header
      const token = req.headers.authorization?.replace('Bearer ', '');
      const fileResponse = {
        id: result.insertId,
        fileName: file.filename,
        originalName: file.originalname,
        fileType: fileType,
        fileSize: file.size,
        mimeType: file.mimetype,
        url: `${(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')}/api/media/file/${file.filename}?token=${token}`
      };

      // Add thumbnail URL if generated
      if (thumbnailFileName) {
        fileResponse.thumbnailUrl = `${(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')}/api/media/file/${thumbnailFileName}?token=${token}`;
      }

      uploadedFiles.push(fileResponse);
    }

    res.status(201).json({
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('File upload error:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      for (const file of req.files) {
        await fs.unlink(file.path).catch(console.error);
      }
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size too large' });
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Too many files' });
      }
    }

    res.status(500).json({ error: 'File upload failed' });
  }
});

// Get media files for a specific entry
router.get('/entry/:entryId', async (req, res) => {
  try {
    const entryId = parseInt(req.params.entryId);
    
    // Verify entry exists and belongs to user
    const [entries] = await pool.execute(
      'SELECT id FROM travel_entries WHERE id = ? AND user_id = ?',
      [entryId, req.user.id]
    );

    if (entries.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // Get media files
    const [files] = await pool.execute(
      'SELECT id, file_name, original_name, file_type, file_size, mime_type, uploaded_at FROM media_files WHERE entry_id = ? ORDER BY uploaded_at DESC',
      [entryId]
    );

    // Add URL for each file
    const token = req.headers.authorization?.replace('Bearer ', '');
    const filesWithUrls = files.map(file => ({
      ...file,
      url: `${(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')}/api/media/file/${file.file_name}?token=${token}`
    }));

    res.json({ files: filesWithUrls });
  } catch (error) {
    console.error('Get media files error:', error);
    res.status(500).json({ error: 'Failed to fetch media files' });
  }
});

// Delete a media file
router.delete('/:fileId', async (req, res) => {
  try {
    const fileId = parseInt(req.params.fileId);
    
    // Get file info and verify ownership
    const [files] = await pool.execute(
      `SELECT mf.*, te.user_id 
       FROM media_files mf 
       JOIN travel_entries te ON mf.entry_id = te.id 
       WHERE mf.id = ?`,
      [fileId]
    );

    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = files[0];

    // Check if user owns the file
    if (file.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete file from database
    await pool.execute('DELETE FROM media_files WHERE id = ?', [fileId]);

    // Delete file from disk
    try {
      await fs.unlink(file.file_path);
    } catch (error) {
      console.error('Failed to delete file from disk:', error);
      // Continue even if file deletion fails
    }

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Get user's media usage stats
router.get('/stats', async (req, res) => {
  try {
    const [stats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_files,
        SUM(file_size) as total_size,
        COUNT(CASE WHEN file_type = 'image' THEN 1 END) as image_count,
        COUNT(CASE WHEN file_type = 'video' THEN 1 END) as video_count
       FROM media_files mf
       JOIN travel_entries te ON mf.entry_id = te.id
       WHERE te.user_id = ?`,
      [req.user.id]
    );

    res.json({
      totalFiles: stats[0].total_files || 0,
      totalSize: stats[0].total_size || 0,
      imageCount: stats[0].image_count || 0,
      videoCount: stats[0].video_count || 0
    });
  } catch (error) {
    console.error('Get media stats error:', error);
    res.status(500).json({ error: 'Failed to fetch media stats' });
  }
});

module.exports = router;
