const express = require('express');
const { pool } = require('../config/database');
const router = express.Router();

// Generate meta tags for public memory sharing
router.get('/memory/:slug/meta', async (req, res) => {
  try {
    const { slug } = req.params;

    // Get memory with user info and media
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

    // Get first image for og:image
    const [media] = await pool.execute(`
      SELECT file_name, file_type
      FROM media_files 
      WHERE entry_id = ? AND file_type = 'image'
      ORDER BY uploaded_at
      LIMIT 1
    `, [memory.id]);

    const baseUrl = process.env.NODE_ENV === 'production' ? 'https://fojourn.site' : 'http://localhost:3001';
    
    // Determine image URL
    let imageUrl = `${baseUrl}/fojourn-logo.png`; // Default fallback
    if (media.length > 0) {
      imageUrl = `${baseUrl}/public/users/${memory.user_id}/memories/${memory.id}/${media[0].file_name}`;
    }

    const metaTags = {
      title: `${memory.title} - ${memory.first_name} ${memory.last_name} | Fojourn`,
      description: memory.description ? 
        memory.description.substring(0, 160) + (memory.description.length > 160 ? '...' : '') :
        `Check out this amazing travel memory from ${memory.first_name} ${memory.last_name} on Fojourn!`,
      image: imageUrl,
      url: `${baseUrl}/u/${memory.username}/memory/${slug}`,
      siteName: 'Fojourn - Travel Memory Journal',
      type: 'article',
      author: `${memory.first_name} ${memory.last_name}`,
      publishedTime: memory.entry_date,
      location: memory.location_name
    };

    res.json(metaTags);

  } catch (error) {
    console.error('Error generating meta tags:', error);
    res.status(500).json({ error: 'Failed to generate meta tags' });
  }
});

// Generate HTML page with proper meta tags for social sharing
router.get('/memory/:slug/share', async (req, res) => {
  try {
    const { slug } = req.params;

    // Get meta tags
    const metaResponse = await fetch(`${req.protocol}://${req.get('host')}/api/meta/memory/${slug}/meta`);
    if (!metaResponse.ok) {
      return res.status(404).send('Memory not found');
    }
    
    const meta = await metaResponse.json();
    const frontendUrl = process.env.NODE_ENV === 'production' ? 'https://fojourn.site' : 'http://localhost:3000';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="${meta.type}" />
    <meta property="og:url" content="${meta.url}" />
    <meta property="og:title" content="${meta.title}" />
    <meta property="og:description" content="${meta.description}" />
    <meta property="og:image" content="${meta.image}" />
    <meta property="og:site_name" content="${meta.siteName}" />
    <meta property="article:author" content="${meta.author}" />
    <meta property="article:published_time" content="${meta.publishedTime}" />
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="${meta.url}" />
    <meta property="twitter:title" content="${meta.title}" />
    <meta property="twitter:description" content="${meta.description}" />
    <meta property="twitter:image" content="${meta.image}" />
    
    <title>${meta.title}</title>
    
    <!-- Redirect to React app after meta tags are loaded -->
    <script>
        setTimeout(() => {
            window.location.href = '${frontendUrl}/u/${req.params.username || 'user'}/memory/${slug}';
        }, 100);
    </script>
</head>
<body>
    <h1>${meta.title}</h1>
    <p>Redirecting to the full memory view...</p>
    <a href="${frontendUrl}/u/${req.params.username || 'user'}/memory/${slug}">Click here if you're not redirected automatically</a>
</body>
</html>`;

    res.send(html);

  } catch (error) {
    console.error('Error generating share page:', error);
    res.status(500).send('Error loading memory');
  }
});

module.exports = router;
