const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/database');

// Admin middleware
const requireAdmin = async (req, res, next) => {
  try {
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

// Configure multer for hero image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/hero-images/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'hero-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Ensure hero images directory exists
const ensureHeroImagesDir = async () => {
  try {
    await fs.access('uploads/hero-images/');
  } catch {
    await fs.mkdir('uploads/hero-images/', { recursive: true });
  }
};

// Get all hero images for admin
router.get('/admin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const query = `
      SELECT 
        h.id,
        h.filename,
        h.original_name,
        h.image_url,
        h.title,
        h.subtitle,
        h.display_order,
        h.is_active,
        h.created_at,
        h.updated_at,
        u.username as uploaded_by_name
      FROM hero_images h
      LEFT JOIN users u ON h.uploaded_by = u.id
      ORDER BY h.display_order ASC, h.created_at DESC
    `;
    
    const db = pool;
    const [results] = await db.execute(query);
    
    // Add full image URLs
    const heroImages = results.map(image => ({
      ...image,
      image_url: image.filename !== 'gradient-fallback' 
        ? `${req.protocol}://${req.get('host')}/api/hero-images/image/${image.filename}`
        : '',
      is_active: Boolean(image.is_active)
    }));
    
    res.json(heroImages);
  } catch (error) {
    console.error('Error fetching hero images:', error);
    res.status(500).json({ error: 'Failed to fetch hero images' });
  }
});

// Get active hero images for public display
router.get('/public', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        filename,
        image_url,
        title,
        subtitle,
        display_order
      FROM hero_images 
      WHERE is_active = true 
      ORDER BY display_order ASC, created_at DESC
    `;
    
    const db = pool;
    const [results] = await db.execute(query);
    
    // Add full image URLs, exclude gradient fallback from public API
    const heroImages = results
      .filter(image => image.filename !== 'gradient-fallback')
      .map(image => ({
        ...image,
        image_url: `${req.protocol}://${req.get('host')}/api/hero-images/image/${image.filename}`
      }));
    
    res.json(heroImages);
  } catch (error) {
    console.error('Error fetching public hero images:', error);
    res.status(500).json({ error: 'Failed to fetch hero images' });
  }
});

// Upload new hero image
router.post('/admin/upload', authenticateToken, requireAdmin, upload.single('heroImage'), async (req, res) => {
  console.log('=== HERO IMAGE UPLOAD REQUEST RECEIVED ===');
  console.log('Request body:', req.body);
  console.log('Request file:', req.file);
  console.log('User:', req.user);
  
  try {
    await ensureHeroImagesDir();
    
    if (!req.file) {
      console.log('No file provided');
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const { title, subtitle, displayOrder } = req.body;
    console.log('Extracted form data:', { title, subtitle, displayOrder });
    
    // Optimize image with Sharp
    const optimizedFilename = 'optimized-' + req.file.filename;
    const optimizedPath = path.join('uploads/hero-images/', optimizedFilename);
    console.log('Processing image:', req.file.path, '->', optimizedPath);
    
    await sharp(req.file.path)
      .resize(1920, 1080, { 
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 85 })
      .toFile(optimizedPath);
      
    console.log('Image processed successfully');
    
    // Remove original file (with retry for Windows file locking issues)
    try {
      // Small delay to ensure Sharp has released the file handle
      await new Promise(resolve => setTimeout(resolve, 100));
      await fs.unlink(req.file.path);
      console.log('Original file removed');
    } catch (unlinkError) {
      console.warn('Could not delete original file (file may be locked):', unlinkError.message);
      // Continue anyway - the optimized file was created successfully
    }
    
    const db = pool;
    const imageUrl = `${req.protocol}://${req.get('host')}/api/hero-images/image/${optimizedFilename}`;
    console.log('Generated image URL:', imageUrl);
    
    const query = `
      INSERT INTO hero_images (
        filename, 
        original_name, 
        image_url, 
        title, 
        subtitle, 
        display_order, 
        uploaded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    console.log('Executing database query with params:', [
      optimizedFilename,
      req.file.originalname,
      imageUrl,
      title || '',
      subtitle || '',
      parseInt(displayOrder) || 0,
      req.user.id
    ]);
    
    const [result] = await db.execute(query, [
      optimizedFilename,
      req.file.originalname,
      imageUrl,
      title || '',
      subtitle || '',
      parseInt(displayOrder) || 0,
      req.user.id
    ]);
    
    console.log('Database insert result:', result);
    
    const response = {
      id: result.insertId,
      filename: optimizedFilename,
      original_name: req.file.originalname,
      image_url: imageUrl,
      title: title || '',
      subtitle: subtitle || '',
      display_order: parseInt(displayOrder) || 0,
      is_active: true,
      message: 'Hero image uploaded successfully'
    };
    
    console.log('Sending response:', response);
    res.json(response);
    
  } catch (error) {
    console.error('=== HERO IMAGE UPLOAD ERROR ===');
    console.error('Error details:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to upload hero image', details: error.message });
  }
});

// Update hero image
router.put('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, displayOrder, isActive } = req.body;
    
    const db = pool;
    const query = `
      UPDATE hero_images 
      SET title = ?, subtitle = ?, display_order = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await db.execute(query, [
      title || '',
      subtitle || '',
      parseInt(displayOrder) || 0,
      isActive ? 1 : 0,
      id
    ]);
    
    res.json({ message: 'Hero image updated successfully' });
  } catch (error) {
    console.error('Error updating hero image:', error);
    res.status(500).json({ error: 'Failed to update hero image' });
  }
});

// Delete hero image
router.delete('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (id === '1') {
      return res.status(400).json({ error: 'Cannot delete default gradient fallback' });
    }
    
    const db = pool;
    
    // Get filename before deletion
    const [existing] = await db.execute('SELECT filename FROM hero_images WHERE id = ?', [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Hero image not found' });
    }
    
    const filename = existing[0].filename;
    
    // Delete from database
    await db.execute('DELETE FROM hero_images WHERE id = ?', [id]);
    
    // Delete file if it exists and it's not the gradient fallback
    if (filename !== 'gradient-fallback') {
      try {
        await fs.unlink(path.join('uploads/hero-images/', filename));
      } catch (error) {
        console.warn('Could not delete hero image file:', filename, error.message);
      }
    }
    
    res.json({ message: 'Hero image deleted successfully' });
  } catch (error) {
    console.error('Error deleting hero image:', error);
    res.status(500).json({ error: 'Failed to delete hero image' });
  }
});

// Serve hero image files
router.get('/image/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, '../uploads/hero-images/', filename);
  
  // Set comprehensive CORS headers before sending file
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  res.sendFile(filepath, (err) => {
    if (err) {
      console.error('Error serving hero image:', err);
      // Only send error response if headers haven't been sent
      if (!res.headersSent) {
        res.status(404).json({ error: 'Image not found' });
      }
    }
  });
});

module.exports = router;
