const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../../config/database');
const { authenticateToken } = require('../../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

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

// Get all static pages for admin management
router.get('/', requireAdmin, async (req, res) => {
  try {
    const [pages] = await pool.execute(`
      SELECT id, slug, title, meta_title, meta_description, is_published, created_at, updated_at
      FROM static_pages 
      ORDER BY created_at DESC
    `);

    res.json({ pages });
  } catch (error) {
    console.error('Error fetching admin static pages:', error);
    res.status(500).json({ error: 'Failed to fetch static pages' });
  }
});

// Get single static page for admin editing
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [pages] = await pool.execute(`
      SELECT id, slug, title, content, meta_title, meta_description, is_published, created_at, updated_at
      FROM static_pages 
      WHERE id = ?
    `, [id]);

    if (!pages.length) {
      return res.status(404).json({ error: 'Page not found' });
    }

    res.json({ page: pages[0] });
  } catch (error) {
    console.error('Error fetching static page for admin:', error);
    res.status(500).json({ error: 'Failed to fetch static page' });
  }
});

// Create new static page
router.post('/', [
  requireAdmin,
  body('slug').isLength({ min: 1, max: 100 }).trim().matches(/^[a-zA-Z0-9-_]+$/).withMessage('Slug must only contain letters, numbers, hyphens, and underscores'),
  body('title').isLength({ min: 1, max: 255 }).trim(),
  body('content').isLength({ min: 1 }),
  body('meta_title').optional().isLength({ max: 100 }).trim(),
  body('meta_description').optional().isLength({ max: 160 }).trim(),
  body('is_published').isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { slug, title, content, meta_title, meta_description, is_published } = req.body;

    // Check if slug already exists
    const [existing] = await pool.execute('SELECT id FROM static_pages WHERE slug = ?', [slug]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'A page with this slug already exists' });
    }

    const [result] = await pool.execute(`
      INSERT INTO static_pages (slug, title, content, meta_title, meta_description, is_published)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [slug, title, content, meta_title || null, meta_description || null, is_published]);

    // Get the created page
    const [newPage] = await pool.execute(`
      SELECT id, slug, title, content, meta_title, meta_description, is_published, created_at, updated_at
      FROM static_pages WHERE id = ?
    `, [result.insertId]);

    res.status(201).json({ 
      message: 'Static page created successfully',
      page: newPage[0]
    });
  } catch (error) {
    console.error('Error creating static page:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'A page with this slug already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create static page' });
    }
  }
});

// Update static page
router.put('/:id', [
  requireAdmin,
  body('slug').isLength({ min: 1, max: 100 }).trim().matches(/^[a-zA-Z0-9-_]+$/).withMessage('Slug must only contain letters, numbers, hyphens, and underscores'),
  body('title').isLength({ min: 1, max: 255 }).trim(),
  body('content').isLength({ min: 1 }),
  body('meta_title').optional().isLength({ max: 100 }).trim(),
  body('meta_description').optional().isLength({ max: 160 }).trim(),
  body('is_published').isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { slug, title, content, meta_title, meta_description, is_published } = req.body;

    // Check if page exists
    const [existing] = await pool.execute('SELECT id FROM static_pages WHERE id = ?', [id]);
    if (!existing.length) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // Check if slug conflicts with another page
    const [slugConflict] = await pool.execute('SELECT id FROM static_pages WHERE slug = ? AND id != ?', [slug, id]);
    if (slugConflict.length > 0) {
      return res.status(400).json({ error: 'A page with this slug already exists' });
    }

    await pool.execute(`
      UPDATE static_pages 
      SET slug = ?, title = ?, content = ?, meta_title = ?, meta_description = ?, is_published = ?
      WHERE id = ?
    `, [slug, title, content, meta_title || null, meta_description || null, is_published, id]);

    // Get the updated page
    const [updatedPage] = await pool.execute(`
      SELECT id, slug, title, content, meta_title, meta_description, is_published, created_at, updated_at
      FROM static_pages WHERE id = ?
    `, [id]);

    res.json({ 
      message: 'Static page updated successfully',
      page: updatedPage[0]
    });
  } catch (error) {
    console.error('Error updating static page:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'A page with this slug already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update static page' });
    }
  }
});

// Delete static page
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute('DELETE FROM static_pages WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }

    res.json({ message: 'Static page deleted successfully' });
  } catch (error) {
    console.error('Error deleting static page:', error);
    res.status(500).json({ error: 'Failed to delete static page' });
  }
});

// Toggle page publication status
router.put('/:id/publish', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_published } = req.body;

    const [result] = await pool.execute(
      'UPDATE static_pages SET is_published = ? WHERE id = ?',
      [is_published, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }

    res.json({ 
      message: `Page ${is_published ? 'published' : 'unpublished'} successfully` 
    });
  } catch (error) {
    console.error('Error toggling publication status:', error);
    res.status(500).json({ error: 'Failed to update page publication status' });
  }
});

module.exports = router;