const express = require('express');
const { pool } = require('../config/database');

const router = express.Router();

// ============ PUBLIC ROUTES (unauthenticated) ============

// Get all published static pages (for footer display)
router.get('/public', async (req, res) => {
  try {
    const [pages] = await pool.execute(`
      SELECT id, slug, title, meta_title, meta_description
      FROM static_pages 
      WHERE is_published = true 
      ORDER BY title ASC
    `);

    res.json({ pages });
  } catch (error) {
    console.error('Error fetching public static pages:', error);
    res.status(500).json({ error: 'Failed to fetch static pages' });
  }
});

// Get single published static page by slug (public view)
router.get('/public/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const [pages] = await pool.execute(`
      SELECT id, slug, title, content, meta_title, meta_description, updated_at
      FROM static_pages 
      WHERE slug = ? AND is_published = true
    `, [slug]);

    if (!pages.length) {
      return res.status(404).json({ error: 'Page not found' });
    }

    res.json({ page: pages[0] });
  } catch (error) {
    console.error('Error fetching static page:', error);
    res.status(500).json({ error: 'Failed to fetch static page' });
  }
});

module.exports = router;