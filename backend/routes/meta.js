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
    let imageUrl = `${baseUrl}/fojourn-icon.png`; // Default fallback (correct filename)
    if (media.length > 0) {
      // Add cache busting parameter to force Facebook to fetch fresh image
      const timestamp = Date.now();
      imageUrl = `${baseUrl}/public/users/${memory.user_id}/memories/${memory.id}/${media[0].file_name}?v=${timestamp}`;
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
    let imageUrl = `${baseUrl}/fojourn-icon.png`; // Default fallback (correct filename)
    if (media.length > 0) {
      // Add cache busting parameter to force Facebook to fetch fresh image
      const timestamp = Date.now();
      imageUrl = `${baseUrl}/public/users/${memory.user_id}/memories/${memory.id}/${media[0].file_name}?v=${timestamp}`;
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
    
    <!-- Manual redirect only - no automatic redirect for any user agent -->
    <script>
        // Only redirect on manual user action, never automatically
        function redirectToMemory() {
            window.location.href = '${url}';
        }
        
        // Check if this is likely a human user (not a bot)
        const userAgent = navigator.userAgent.toLowerCase();
        const isFacebookBot = userAgent.includes('facebookexternalhit') || userAgent.includes('facebookcatalog');
        const isOtherBot = /bot|crawler|spider|twitter|whatsapp|telegram|googlebot|bingbot/i.test(userAgent);
        
        // Only show redirect option for humans, never auto-redirect
        if (!isFacebookBot && !isOtherBot && typeof window !== 'undefined') {
            // Add redirect button after page loads
            setTimeout(() => {
                const redirectBtn = document.createElement('button');
                redirectBtn.innerHTML = 'View Full Memory →';
                redirectBtn.style.cssText = 'padding: 10px 20px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; margin: 20px 0;';
                redirectBtn.onclick = redirectToMemory;
                document.body.appendChild(redirectBtn);
            }, 1000);
        }
    </script>
</head>
<body>
    <h1>${title}</h1>
    <p>${description}</p>
    ${media.length > 0 ? `<img src="${imageUrl}" alt="${title}" style="max-width: 100%; height: auto;" />` : ''}
    <p><a href="${url}">View the full memory →</a></p>
    
    <!-- For all visitors -->
    <script>
        const userAgent = navigator.userAgent.toLowerCase();
        const isFacebookBot = userAgent.includes('facebookexternalhit') || userAgent.includes('facebookcatalog');
        const isOtherBot = /bot|crawler|spider|twitter|whatsapp|telegram|googlebot|bingbot/i.test(userAgent);
        
        if (isFacebookBot) {
            document.body.innerHTML += '<p>This page contains optimized meta tags for Facebook sharing.</p>';
        } else if (isOtherBot) {
            document.body.innerHTML += '<p>This is a sharing page for social media bots.</p>';
        }
        // Human users will get the redirect button added by the previous script
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
