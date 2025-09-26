const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { generateVideoThumbnail, getThumbnailFileName, isVideoFile } = require('../utils/videoUtils');
const { checkAndAwardBadges } = require('../utils/badgeUtils');

const router = express.Router();

// Serve uploaded files (public access with token validation) - BEFORE auth middleware
router.get('/file/:filename', async (req, res) => {
  // Set cache control headers to prevent caching
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
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

    // Verify token and get user merge information
    let userId, isAdmin = false, isMerged = false, partnerUserId = null;
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.userId || decoded.id; // Support both formats
      isAdmin = decoded.isAdmin || false;
      console.log('Token decoded, userId:', userId, 'isAdmin:', isAdmin);
      
      // Get user merge information from database
      const [users] = await pool.execute(
        `SELECT 
           u.id, u.is_admin,
           umi.is_merged, umi.partner_user_id
         FROM users u
         LEFT JOIN user_merge_info umi ON u.id = umi.user_id
         WHERE u.id = ? AND u.is_active = TRUE`,
        [userId]
      );
      
      if (users.length > 0) {
        isAdmin = users[0].is_admin || false;
        isMerged = users[0].is_merged || false;
        partnerUserId = users[0].partner_user_id;
        console.log('User merge info:', { isMerged, partnerUserId });
      }
      
    } catch (err) {
      console.log('Token verification failed:', err.message);
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Check if this is a thumbnail file request
    const isThumbRequest = filename.includes('_thumb.');
    
    if (isThumbRequest) {
      // For thumbnail files, find the original file in the database
      // Extract base filename without _thumb suffix
      const thumbMatch = filename.match(/^(.+)_thumb\.(jpg|jpeg|png)$/i);
      if (!thumbMatch) {
        console.log('Invalid thumbnail filename format:', filename);
        return res.status(400).json({ error: 'Invalid thumbnail filename' });
      }
      
      const baseFilename = thumbMatch[1];
      console.log('Thumbnail request for:', filename, 'Base filename:', baseFilename);
      
      // Find any file (image or video) with this base name
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
      console.log('Thumbnail found for file, owner userId:', file.user_id, 'requesting userId:', userId, 'isAdmin:', isAdmin);

      // Check if user owns the original file, is admin, or is merged with the owner
      const hasAccess = file.user_id === userId || 
                       isAdmin || 
                       (isMerged && partnerUserId && file.user_id === partnerUserId);
                       
      if (!hasAccess) {
        console.log('Access denied - user does not own original file, is not admin, and is not merged with owner');
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
      
    // Add CORS and CORP headers - allow production domain
    const allowedOrigin = process.env.NODE_ENV === 'production' 
      ? (process.env.FRONTEND_URL || 'https://fojourn.site')
      : 'http://localhost:3000';
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
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
    console.log('File found, owner userId:', file.user_id, 'requesting userId:', userId, 'isAdmin:', isAdmin);

    // Check if user owns the file, is admin, or is merged with the owner
    const hasAccess = file.user_id === userId || 
                     isAdmin || 
                     (isMerged && partnerUserId && file.user_id === partnerUserId);
                     
    if (!hasAccess) {
      console.log('Access denied - user does not own file, is not admin, and is not merged with owner');
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
    const allowedOrigin = process.env.NODE_ENV === 'production' 
      ? (process.env.FRONTEND_URL || 'https://fojourn.site')
      : 'http://localhost:3000';
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    res.sendFile(filePath);
  } catch (error) {
    console.error('File serve error:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

// All OTHER routes require authentication
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
    
    // Verify entry exists and belongs to user or merged partner
    let userIds = [req.user.id];
    if (req.user.is_merged && req.user.partner_user_id) {
      userIds.push(req.user.partner_user_id);
    }
    const userIdPlaceholders = userIds.map(() => '?').join(',');
    
    const [entries] = await pool.execute(
      `SELECT id FROM travel_entries WHERE id = ? AND user_id IN (${userIdPlaceholders})`,
      [entryId, ...userIds]
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

      // Generate thumbnail for image files and fix orientation
      if (fileType === 'image') {
        try {
          // First, process the main image to fix EXIF orientation
          await sharp(file.path)
            .rotate() // Automatically rotate based on EXIF orientation data
            .toFile(file.path + '_temp');
          
          // Replace original with corrected version
          await fs.rename(file.path + '_temp', file.path);
          console.log(`Image orientation corrected: ${file.filename}`);
          
          // Generate thumbnail from the orientation-corrected image
          const extension = path.extname(file.filename);
          const baseName = path.basename(file.filename, extension);
          thumbnailFileName = `${baseName}_thumb.jpg`;
          thumbnailPath = path.join(path.dirname(file.path), thumbnailFileName);
          
          await sharp(file.path)
            .resize(320, 240, {
              fit: 'cover',
              position: 'center'
            })
            .jpeg({ quality: 85 })
            .toFile(thumbnailPath);
          
          console.log(`Image thumbnail generated: ${thumbnailPath}`);
          // Store just the filename, not the full path
          thumbnailPath = thumbnailFileName;
        } catch (error) {
          console.warn(`Failed to process image ${file.filename}:`, error);
          // Continue without thumbnail if processing fails
          thumbnailPath = null;
        }
      }
      
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
        url: `${process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? 'https://fojourn.site' : 'http://localhost:3001')}/api/media/file/${file.filename}?token=${token}`
      };

      // Add thumbnail URL if generated
      if (thumbnailFileName) {
        fileResponse.thumbnailUrl = `${process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? 'https://fojourn.site' : 'http://localhost:3001')}/api/media/file/${thumbnailFileName}?token=${token}`;
      }

      uploadedFiles.push(fileResponse);
    }

    // Check and award badges for media uploads
    let allAwardedBadges = [];
    try {
      const imageFiles = uploadedFiles.filter(f => f.fileType === 'image');
      const videoFiles = uploadedFiles.filter(f => f.fileType === 'video');
      
      if (imageFiles.length > 0) {
        const awardedBadges = await checkAndAwardBadges(req.user.id, 'photo_uploaded', {
          entryId: entryId,
          fileCount: imageFiles.length
        });
        
        allAwardedBadges.push(...awardedBadges);
        
        if (awardedBadges.length > 0) {
          console.log(`✓ User ${req.user.id} earned ${awardedBadges.length} badge(s) for uploading photos:`, awardedBadges.map(b => b.name));
        }
      }
      
      if (videoFiles.length > 0) {
        const awardedBadges = await checkAndAwardBadges(req.user.id, 'video_uploaded', {
          entryId: entryId,
          fileCount: videoFiles.length
        });
        
        allAwardedBadges.push(...awardedBadges);
        
        if (awardedBadges.length > 0) {
          console.log(`✓ User ${req.user.id} earned ${awardedBadges.length} badge(s) for uploading videos:`, awardedBadges.map(b => b.name));
        }
      }
    } catch (badgeError) {
      console.error('Badge checking error for media upload:', badgeError);
      // Don't fail the upload if badge checking fails
    }

    res.status(201).json({
      message: 'Files uploaded successfully',
      files: uploadedFiles,
      awardedBadges: allAwardedBadges
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
  // Set cache control headers to prevent caching
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  try {
    const entryId = parseInt(req.params.entryId);
    
    // Verify entry exists and belongs to user or merged partner
    let userIds = [req.user.id];
    if (req.user.is_merged && req.user.partner_user_id) {
      userIds.push(req.user.partner_user_id);
    }
    const userIdPlaceholders = userIds.map(() => '?').join(',');
    
    const [entries] = await pool.execute(
      `SELECT id FROM travel_entries WHERE id = ? AND user_id IN (${userIdPlaceholders})`,
      [entryId, ...userIds]
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
      url: `${process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? 'https://fojourn.site' : 'http://localhost:3001')}/api/media/file/${file.file_name}?token=${token}`
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

    // Check if user owns the file or is merged with the owner
    const hasAccess = file.user_id === req.user.id || 
                     (req.user.is_merged && req.user.partner_user_id && file.user_id === req.user.partner_user_id);
                     
    if (!hasAccess) {
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
  // Set cache control headers to prevent caching
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  try {
    // Build user IDs list - include partner if merged
    let userIds = [req.user.id];
    if (req.user.is_merged && req.user.partner_user_id) {
      userIds.push(req.user.partner_user_id);
    }
    const userIdPlaceholders = userIds.map(() => '?').join(',');
    
    const [stats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_files,
        SUM(file_size) as total_size,
        COUNT(CASE WHEN file_type = 'image' THEN 1 END) as image_count,
        COUNT(CASE WHEN file_type = 'video' THEN 1 END) as video_count
       FROM media_files mf
       JOIN travel_entries te ON mf.entry_id = te.id
       WHERE te.user_id IN (${userIdPlaceholders})`,
      userIds
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
