const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get shareable content for an entry
router.get('/entry/:id', authenticateToken, async (req, res) => {
  try {
    const entryId = parseInt(req.params.id);
    
    // Get the travel entry with all details
    const [entries] = await pool.execute(
      `SELECT 
        id, title, description, latitude, longitude, 
        location_name as locationName, 
        memory_type as memoryType,
        restaurant_rating as restaurantRating,
        is_dog_friendly as isDogFriendly,
        entry_date as entryDate, 
        created_at as createdAt
       FROM travel_entries 
       WHERE id = ? AND user_id = ?`,
      [entryId, req.user.id]
    );

    if (entries.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const entry = entries[0];

    // Get media files (for image sharing)
    const [media] = await pool.execute(
      `SELECT 
        id, 
        file_name as fileName, 
        original_name as originalName, 
        file_type as fileType
       FROM media_files 
       WHERE entry_id = ? AND file_type = 'image'
       ORDER BY uploaded_at ASC
       LIMIT 1`,
      [entry.id]
    );

    // Get tags
    const [tags] = await pool.execute(
      'SELECT tag FROM entry_tags WHERE entry_id = ?',
      [entry.id]
    );

    // Generate share content
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const shareUrl = `${baseUrl}/entry/${entry.id}`;
    const entryDate = new Date(entry.entryDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Create engaging share text based on memory type
    let shareText = '';
    const locationText = entry.locationName ? ` at ${entry.locationName}` : '';
    
    switch (entry.memoryType) {
      case 'restaurant':
      case 'brewery':
        const ratingEmoji = entry.restaurantRating === 'happy' ? '😋' : 
                           entry.restaurantRating === 'sad' ? '😞' : '😐';
        shareText = `${ratingEmoji} Just experienced "${entry.title}"${locationText}! ${entry.description ? entry.description : 'What a memorable dining experience!'} #FoodieTravel #${entry.memoryType}`;
        break;
      case 'attraction':
        shareText = `🏛️ Visited "${entry.title}"${locationText} on ${entryDate}! ${entry.description ? entry.description : 'Such an amazing place to explore!'} #TravelMemories #Attractions`;
        break;
      case 'accommodation':
        shareText = `🏨 Stayed at "${entry.title}"${locationText}! ${entry.description ? entry.description : 'Great place to rest during my travels!'} #TravelStay #Accommodation`;
        break;
      case 'activity':
        shareText = `🎯 Had fun with "${entry.title}"${locationText}! ${entry.description ? entry.description : 'What an exciting experience!'} #TravelActivities #Adventure`;
        break;
      default:
        shareText = `✈️ Travel memory: "${entry.title}"${locationText} from ${entryDate}! ${entry.description ? entry.description : 'Another amazing travel experience!'} #TravelMemories`;
    }

    // Add dog-friendly emoji if applicable
    if (entry.isDogFriendly) {
      shareText += ' 🐶 #DogFriendly';
    }

    // Add location hashtags
    if (entry.locationName) {
      const locationHashtag = entry.locationName.replace(/[^a-zA-Z0-9]/g, '');
      shareText += ` #${locationHashtag}`;
    }

    // Add custom tags as hashtags
    const tagHashtags = tags.map(t => `#${t.tag.replace(/[^a-zA-Z0-9]/g, '')}`).join(' ');
    if (tagHashtags) {
      shareText += ` ${tagHashtags}`;
    }

    const response = {
      id: entry.id,
      title: entry.title,
      description: entry.description,
      shareUrl: shareUrl,
      shareText: shareText,
      formattedDate: entryDate,
      location: entry.locationName,
      memoryType: entry.memoryType,
      tags: tags.map(t => t.tag),
      hasImage: media.length > 0,
      imageUrl: media.length > 0 ? `${baseUrl}/api/media/file/${media[0].fileName}` : null,
      
      // Platform-specific content
      platforms: {
        facebook: {
          text: shareText,
          url: shareUrl
        },
        instagram: {
          caption: shareText,
          hashtags: ['TravelMemories', entry.memoryType, ...tags.map(t => t.tag.replace(/[^a-zA-Z0-9]/g, ''))]
        },
        twitter: {
          text: shareText.length > 250 ? shareText.substring(0, 247) + '...' : shareText,
          url: shareUrl,
          hashtags: ['travel', entry.memoryType]
        }
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Get share content error:', error);
    res.status(500).json({ error: 'Failed to generate share content' });
  }
});

// Serve a shareable page with Open Graph meta tags for social media crawlers
router.get('/page/:id', async (req, res) => {
  try {
    const entryId = parseInt(req.params.id);
    
    // Get the travel entry (without authentication for public sharing)
    const [entries] = await pool.execute(
      `SELECT 
        id, title, description, latitude, longitude, 
        location_name as locationName, 
        memory_type as memoryType,
        restaurant_rating as restaurantRating,
        is_dog_friendly as isDogFriendly,
        entry_date as entryDate, 
        created_at as createdAt
       FROM travel_entries 
       WHERE id = ?`,
      [entryId]
    );

    if (entries.length === 0) {
      return res.status(404).send('Entry not found');
    }

    const entry = entries[0];

    // Get first image for sharing
    const [media] = await pool.execute(
      `SELECT file_name as fileName FROM media_files 
       WHERE entry_id = ? AND file_type = 'image'
       ORDER BY uploaded_at ASC LIMIT 1`,
      [entry.id]
    );

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const frontendUrl = req.get('host').includes('3001') ? 
      baseUrl.replace('3001', '3000') : baseUrl;
    const imageUrl = media.length > 0 ? `${baseUrl}/api/media/file/${media[0].fileName}` : null;
    const redirectUrl = `${frontendUrl}/entry/${entry.id}`;

    const entryDate = new Date(entry.entryDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Create description for social media
    const locationText = entry.locationName ? ` at ${entry.locationName}` : '';
    const socialDescription = entry.description || 
      `A travel memory from ${entryDate}${locationText}. Shared from my travel log.`;

    // Generate HTML page with Open Graph meta tags
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${entry.title} - Travel Memory</title>
    
    <!-- Open Graph Meta Tags for Facebook -->
    <meta property="og:title" content="${entry.title}" />
    <meta property="og:description" content="${socialDescription}" />
    <meta property="og:url" content="${baseUrl}/api/share/page/${entry.id}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Travel Log" />
    ${imageUrl ? `<meta property="og:image" content="${imageUrl}" />` : ''}
    ${imageUrl ? `<meta property="og:image:alt" content="${entry.title}" />` : ''}
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${entry.title}" />
    <meta name="twitter:description" content="${socialDescription}" />
    ${imageUrl ? `<meta name="twitter:image" content="${imageUrl}" />` : ''}
    
    <!-- Auto-redirect to frontend -->
    <meta http-equiv="refresh" content="0; url=${redirectUrl}" />
    
    <style>
        body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .redirect-message {
            color: #666;
            margin-top: 20px;
        }
        .entry-preview {
            margin: 20px 0;
        }
        .entry-image {
            max-width: 100%;
            border-radius: 8px;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${entry.title}</h1>
        <div class="entry-preview">
            ${imageUrl ? `<img src="${imageUrl}" alt="${entry.title}" class="entry-image" />` : ''}
            <p>${socialDescription}</p>
            <p><strong>Date:</strong> ${entryDate}</p>
            ${entry.locationName ? `<p><strong>Location:</strong> ${entry.locationName}</p>` : ''}
        </div>
        <p class="redirect-message">
            Redirecting to the full travel entry...
            <br>
            <a href="${redirectUrl}">Click here if you're not redirected automatically</a>
        </p>
    </div>
</body>
</html>`;

    res.send(html);
  } catch (error) {
    console.error('Get share page error:', error);
    res.status(500).send('Failed to load share page');
  }
});

// Get share statistics for an entry (optional - for analytics)
router.get('/stats/:id', authenticateToken, async (req, res) => {
  try {
    const entryId = parseInt(req.params.id);
    
    // Check if entry belongs to user
    const [entries] = await pool.execute(
      'SELECT id FROM travel_entries WHERE id = ? AND user_id = ?',
      [entryId, req.user.id]
    );

    if (entries.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // In a real app, you might track share counts in a separate table
    // For now, we'll return a basic response
    res.json({
      entryId: entryId,
      totalShares: 0, // Would come from a shares tracking table
      platforms: {
        facebook: 0,
        instagram: 0,
        twitter: 0,
        other: 0
      }
    });
  } catch (error) {
    console.error('Get share stats error:', error);
    res.status(500).json({ error: 'Failed to get share statistics' });
  }
});

module.exports = router;
