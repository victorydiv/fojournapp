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

    // Get memory with user info and media directly (same logic as meta endpoint)
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
      return res.status(404).send('Memory not found');
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
    const frontendUrl = process.env.NODE_ENV === 'production' ? 'https://fojourn.site' : 'http://localhost:3000';
    
    // Determine image URL
    let imageUrl = `${baseUrl}/fojourn-logo.png`; // Default fallback
    if (media.length > 0) {
      imageUrl = `${baseUrl}/public/users/${memory.user_id}/memories/${memory.id}/${media[0].file_name}`;
    }

    const title = `${memory.title} - ${memory.first_name} ${memory.last_name} | Fojourn`;
    const description = memory.description ? 
      memory.description.substring(0, 160) + (memory.description.length > 160 ? '...' : '') :
      `Check out this amazing travel memory from ${memory.first_name} ${memory.last_name} on Fojourn!`;
    const url = `${frontendUrl}/u/${memory.username}/memory/${slug}`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    
    <!-- Required Open Graph properties -->
    <meta property="og:url" content="${baseUrl}/api/meta/memory/${slug}/share" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="Fojourn - Travel Memory Journal" />
    
    <!-- Article specific -->
    <meta property="article:author" content="${memory.first_name} ${memory.last_name}" />
    <meta property="article:published_time" content="${memory.entry_date}" />
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${baseUrl}/api/meta/memory/${slug}/share" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
    
    <!-- Standard meta tags -->
    <meta name="description" content="${description}" />
    
    <title>${title}</title>
    
    <!-- Only redirect for human visitors, not bots -->
    <script>
        // Check if this is a bot/crawler
        const userAgent = navigator.userAgent.toLowerCase();
        const isBotOrCrawler = /bot|crawler|spider|facebook|twitter|whatsapp|telegram/i.test(userAgent);
        
        if (!isBotOrCrawler) {
            // Only redirect human visitors after a longer delay
            setTimeout(() => {
                window.location.href = '${url}';
            }, 2000);
        }
    </script>
</head>
<body>
    <h1>${title}</h1>
    <p>${description}</p>
    ${media.length > 0 ? `<img src="${imageUrl}" alt="${title}" style="max-width: 100%; height: auto;" />` : ''}
    <p><a href="${url}">View the full memory →</a></p>
    
    <!-- For human visitors -->
    <script>
        const userAgent = navigator.userAgent.toLowerCase();
        const isBotOrCrawler = /bot|crawler|spider|facebook|twitter|whatsapp|telegram/i.test(userAgent);
        
        if (!isBotOrCrawler) {
            document.body.innerHTML += '<p>Redirecting to the full memory view in 2 seconds...</p>';
        }
    </script>
</body>
</html>`;

    res.send(html);

  } catch (error) {
    console.error('Error generating share page:', error);
    res.status(500).send('Error loading memory');
  }
});

module.exports = router;
