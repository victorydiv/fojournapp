const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Travel log backend server

// Load environment variables FIRST
require('dotenv').config();

console.log('Environment loaded - DB_USER:', process.env.DB_USER);

const { testConnection, initializeDatabase } = require('./config/database');

const authRoutes = require('./routes/auth');
const entryRoutes = require('./routes/entries');
const mediaRoutes = require('./routes/media');
const searchRoutes = require('./routes/search');
const journeyRoutes = require('./routes/journeys');
const shareRoutes = require('./routes/share');
const publicRoutes = require('./routes/public');
const collaborationRoutes = require('./routes/collaboration');
const dreamsRoutes = require('./routes/dreams');
const adminRoutes = require('./routes/admin');
const communicationsRoutes = require('./routes/communications');
const emailPreferencesRoutes = require('./routes/email-preferences');
const metaRoutes = require('./routes/meta');
const badgesRoutes = require('./routes/badges');
const blogRoutes = require('./routes/blog');
const heroImagesRoutes = require('./routes/heroImages');
const checklistRoutes = require('./routes/checklists');
const checklistItemsRoutes = require('./routes/checklist-items');
const journeyChecklistRoutes = require('./routes/journey-checklists');
const dreamChecklistRoutes = require('./routes/dream-checklists');
const templateLibraryRoutes = require('./routes/template-library');
const templatesRoutes = require('./routes/templates');
const checklistInstanceRoutes = require('./routes/checklist-instances');
const travelInfoRoutes = require('./routes/travelInfo');
const mergeRoutes = require('./routes/merge');
const memoryTypesRoutes = require('./routes/memory-types');
const adminMemoryTypesRoutes = require('./routes/admin/memory-types');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for DreamHost hosting environment
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
}));
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://fojourn.site',
    'https://fojourn.site'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'cache-control', 'pragma', 'expires']
}));

// Rate limiting - more generous limits for better user experience
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 2000 : 1000, // Increased from 300 to 1000
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 15 * 60 * 1000
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files for uploaded media
app.use('/uploads', express.static('uploads'));

// Public static files for CORS-free access (no authentication required)
app.use('/public', express.static('public', {
  maxAge: '1d',
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'public, max-age=86400');
    // Override helmet's restrictive CORS policy for public media
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.removeHeader('X-Frame-Options');
  }
}));

// Public avatars route for CORS-free access (no authentication required)
app.use('/public/avatars', express.static('uploads/avatars', {
  maxAge: '1d',
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'public, max-age=86400');
    // Override helmet's restrictive CORS policy for public avatars
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.removeHeader('X-Frame-Options');
  }
}));

// Public memory files route for CORS-free access (no authentication required)
app.use('/public/users', express.static('public/users', {
  maxAge: '1d',
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'public, max-age=86400');
    // Override helmet's restrictive CORS policy for public memory files
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.removeHeader('X-Frame-Options');
  }
}));

// Public badge icons route for CORS-free access (no authentication required)
app.use('/public/badge-icons', express.static('uploads/public-badges', {
  maxAge: '1d',
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'public, max-age=86400');
    // Override helmet's restrictive CORS policy for public badge icons
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.removeHeader('X-Frame-Options');
  }
}));

// Public media files route for CORS-free access (no authentication required)
app.use('/public/media', express.static('uploads', {
  maxAge: '1d',
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'public, max-age=86400');
    // Override helmet's restrictive CORS policy for public media files
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.removeHeader('X-Frame-Options');
  }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/entries', entryRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/dreams', dreamsRoutes);
app.use('/api/journeys', collaborationRoutes);
app.use('/api/journeys', journeyRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/communications', communicationsRoutes);
app.use('/api/email-preferences', emailPreferencesRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/badges', badgesRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/hero-images', heroImagesRoutes);
app.use('/api/checklists', checklistItemsRoutes);
app.use('/api/checklists', checklistRoutes);
app.use('/api/journey-checklists', journeyChecklistRoutes);
app.use('/api/dream-checklists', dreamChecklistRoutes);
app.use('/api/template-library', templateLibraryRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/checklist-instances', checklistInstanceRoutes);
app.use('/api/travel-info', travelInfoRoutes);
app.use('/api/merge', mergeRoutes);
app.use('/api/memory-types', memoryTypesRoutes);
app.use('/api/admin/memory-types', adminMemoryTypesRoutes);

// DEBUG: Log ALL incoming requests to help debug Facebook scraping
app.use((req, res, next) => {
  const userAgent = req.get('User-Agent') || '';
  const isFacebookBot = userAgent.includes('facebookexternalhit') || 
                        userAgent.includes('facebookcatalog') || 
                        userAgent.includes('Facebot') ||
                        userAgent.includes('facebook');
  
  if (isFacebookBot || req.url.startsWith('/u/')) {
    console.log('🌐 === ALL REQUEST DEBUG ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Original URL:', req.originalUrl);
    console.log('Path:', req.path);
    console.log('User-Agent:', userAgent);
    console.log('Is Facebook Bot:', isFacebookBot);
    console.log('Host:', req.get('host'));
    console.log('Protocol:', req.protocol);
    console.log('Full URL:', req.protocol + '://' + req.get('host') + req.originalUrl);
    console.log('=== END REQUEST DEBUG ===');
  }
  
  next();
});

// Health check endpoint - Enhanced for monitoring
app.get('/health', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Test database connection
    const { testConnection } = require('./config/database');
    await testConnection();
    
    const dbResponseTime = Date.now() - startTime;
    
    const healthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
      },
      database: {
        status: 'connected',
        responseTime: dbResponseTime
      },
      environment: process.env.NODE_ENV || 'development',
      version: require('./package.json').version || '1.0.0',
      pid: process.pid
    };
    
    res.status(200).json(healthData);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message,
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
      }
    });
  }
});

// Legacy health check endpoint for backward compatibility
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Dynamic XML Sitemap for SEO
app.get('/sitemap.xml', async (req, res) => {
  try {
    res.set('Content-Type', 'text/xml');
    
    const baseUrl = process.env.FRONTEND_URL || 'https://fojourn.site';
    const { pool } = require('./config/database');
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/about</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/privacy</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;

    // Add public user profiles - use username, not ID
    try {
      const [publicUsers] = await pool.execute(
        'SELECT username, updated_at FROM users WHERE profile_public = 1 AND username IS NOT NULL ORDER BY updated_at DESC LIMIT 500'
      );
      
      for (const user of publicUsers) {
        sitemap += `
  <url>
    <loc>${baseUrl}/u/${user.username}</loc>
    <lastmod>${new Date(user.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }
    } catch (error) {
      console.log('Error fetching public users for sitemap:', error.message);
    }

    // Add public travel entries/memories - use username/slug URLs
    try {
      const [publicEntries] = await pool.execute(`
        SELECT e.slug, u.username, e.updated_at 
        FROM travel_entries e
        JOIN users u ON e.user_id = u.id 
        WHERE u.profile_public = 1 
          AND e.notes IS NOT NULL 
          AND TRIM(e.notes) != ''
          AND e.slug IS NOT NULL
          AND u.username IS NOT NULL
        ORDER BY e.updated_at DESC
        LIMIT 1000
      `);

      for (const entry of publicEntries) {
        sitemap += `
  <url>
    <loc>${baseUrl}/u/${entry.username}/memory/${entry.slug}</loc>
    <lastmod>${new Date(entry.updated_at).toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
      }
    } catch (error) {
      console.log('Error fetching public entries for sitemap:', error.message);
    }

    // TODO: Add public journeys when public journey routes are implemented
    // Currently journeys require authentication, so not including in sitemap

    // Add blog posts if they exist - use slug for URL
    try {
      const [blogPosts] = await pool.execute(`
        SELECT slug, updated_at 
        FROM blog_posts 
        WHERE status = 'published' AND slug IS NOT NULL
        ORDER BY updated_at DESC
        LIMIT 100
      `);

      for (const post of blogPosts) {
        sitemap += `
  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <lastmod>${new Date(post.updated_at).toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
      }
    } catch (error) {
      console.log('Error fetching blog posts for sitemap:', error.message);
    }

    sitemap += '\n</urlset>';
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
});

// Robots.txt for SEO
app.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.FRONTEND_URL || 'https://fojourn.site';
  res.type('text/plain');
  res.send(`# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /

# Sitemap location  
Sitemap: ${baseUrl}/sitemap.xml`);
});

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  
  // Special middleware to handle public profile URLs - MUST come before static file serving
  app.get('/u/:username', async (req, res, next) => {
    const userAgent = req.get('User-Agent') || '';
    const isFacebookBot = userAgent.includes('facebookexternalhit') || 
                          userAgent.includes('facebookcatalog') || 
                          userAgent.includes('Facebot') ||
                          userAgent.includes('facebook') ||
                          userAgent.toLowerCase().includes('facebook');
    
    console.log('=== PUBLIC PROFILE REQUEST ===');
    console.log('URL:', req.url);
    console.log('User-Agent:', userAgent);
    console.log('Is Facebook Bot:', isFacebookBot);
    console.log('Username:', req.params.username);
    console.log('Full URL:', req.protocol + '://' + req.get('host') + req.originalUrl);
    
    // ALWAYS serve meta tags for profile URLs (not just for bots) to ensure proper sharing
    console.log('🤖 Serving profile meta tags for all requests');
    try {
      const { username } = req.params;
      
      // Check for merged account scenarios first
      const { handleMergedProfileRequest } = require('./routes/publicProfile');
      const mergedResult = await handleMergedProfileRequest(username, req, res, next);
      if (mergedResult !== null) {
        return; // Merged profile handling took over
      }
      
      // Get user profile data (normal individual profile)
      const { pool } = require('./config/database');
      const [users] = await pool.execute(`
        SELECT 
          u.id,
          u.username,
          u.public_username,
          u.first_name,
          u.last_name,
          u.profile_bio,
          u.hero_image_filename,
          COUNT(te.id) as total_memories
        FROM users u
        LEFT JOIN travel_entries te ON u.id = te.user_id AND te.is_public = 1
        WHERE (u.username = ? OR u.public_username = ?) AND u.profile_public = 1
        GROUP BY u.id
      `, [username, username]);

      if (users.length === 0) {
        console.log('❌ Public profile not found for username:', username);
        return next(); // Fall back to React app (which will show 404)
      }

      const user = users[0];
      console.log('✅ Found user:', user.first_name, user.last_name);
      console.log('Hero image filename:', user.hero_image_filename);
      
      const baseUrl = 'https://fojourn.site';
      
      // Determine hero image URL
      let imageUrl = `${baseUrl}/fojourn-icon.png`; // Default fallback
      if (user.hero_image_filename) {
        // Use the API route which is guaranteed to be public and has proper CORS headers
        imageUrl = `${baseUrl}/api/auth/hero-image/${user.hero_image_filename}`;
        console.log('🖼️ Using public API hero image:', imageUrl);
      } else {
        console.log('📷 No hero image, using default:', imageUrl);
      }

      const displayName = `${user.first_name} ${user.last_name}`.trim();
      // Title should just be the person's name
      const title = displayName;
      // Description should be their profile bio or a simple fallback
      const description = user.profile_bio || 
        `${user.first_name}'s travel memories and adventures.`;
      const url = `${baseUrl}/u/${user.public_username || user.username}`;

      console.log('📋 Generated meta data:');
      console.log('- Title:', title);
      console.log('- Description:', description);
      console.log('- Image URL:', imageUrl);
      console.log('- Profile URL:', url);

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    
    <!-- Open Graph meta tags for Facebook sharing -->
    <meta property="og:url" content="${url}" />
    <meta property="og:type" content="profile" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="400" />
    <meta property="og:site_name" content="Fojourn - Travel Memory Journal" />
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${url}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
    
    <title>${title}</title>
    
    <!-- Auto-redirect for human users -->
    <script>
        // Only redirect humans, not bots
        const userAgent = navigator.userAgent.toLowerCase();
        const isBot = /bot|crawler|spider|facebook|twitter|linkedin|whatsapp|telegram/i.test(userAgent);
        
        if (!isBot && typeof window !== 'undefined') {
            // Redirect to React app after a short delay to ensure meta tags are read
            setTimeout(() => {
                window.location.href = '${url}';
            }, 1000);
        }
    </script>
</head>
<body>
    <div style="padding: 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; text-align: center;">
        <h1 style="color: #1976d2; margin-bottom: 20px;">${displayName}</h1>
        <p style="color: #666; font-size: 18px; line-height: 1.6; margin-bottom: 30px;">${description}</p>
        ${user.hero_image_filename ? `<img src="${imageUrl}" alt="${displayName}'s Hero Image" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin-bottom: 30px;" />` : ''}
        <p style="color: #888; font-size: 14px;">You will be redirected to the full profile shortly...</p>
    </div>
</body>
</html>`;

      return res.send(html);
      
    } catch (error) {
      console.error('Error serving profile meta tags:', error);
      return next(); // Fall back to React app
    }
  });
  
  // Special middleware to handle Facebook bot requests for public memory URLs
  // This MUST come BEFORE the static file middleware
  app.get('/u/:username/memory/:slug', async (req, res, next) => {
    const userAgent = req.get('User-Agent') || '';
    const isFacebookBot = userAgent.includes('facebookexternalhit') || userAgent.includes('facebookcatalog');
    
    console.log('=== PUBLIC MEMORY REQUEST ===');
    console.log('URL:', req.url);
    console.log('User-Agent:', userAgent);
    console.log('Is Facebook Bot:', isFacebookBot);
    console.log('Username:', req.params.username);
    console.log('Slug:', req.params.slug);
    
    // If it's Facebook bot, serve meta tags instead of React app
    if (isFacebookBot) {
      console.log('🤖 Facebook bot detected - serving meta tags');
      try {
        const { username, slug } = req.params;
        
        // Get memory data and user info
        const { pool } = require('./config/database');
        const [memories] = await pool.execute(`
          SELECT 
            te.*,
            u.username,
            u.first_name,
            u.last_name,
            u.avatar_filename,
            u.public_username
          FROM travel_entries te
          JOIN users u ON te.user_id = u.id
          WHERE te.public_slug = ? AND te.is_public = 1 AND u.profile_public = 1 AND (u.username = ? OR u.public_username = ?)
        `, [slug, username, username]);

        if (memories.length === 0) {
          return next(); // Let React handle 404
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

        const baseUrl = 'https://fojourn.site';
        
        // Determine image URL
        let imageUrl = `${baseUrl}/fojourn-icon.png`; // Default fallback
        if (media.length > 0) {
          const timestamp = Date.now();
          const random = Math.floor(Math.random() * 1000000);
          imageUrl = `${baseUrl}/public/users/${memory.user_id}/memories/${memory.id}/${media[0].file_name}?cache=${timestamp}&r=${random}`;
        }

        const title = `${memory.title} - ${memory.first_name} ${memory.last_name} | Fojourn`;
        const description = memory.description ? 
          memory.description.substring(0, 160) + (memory.description.length > 160 ? '...' : '') :
          `Check out this amazing travel memory from ${memory.first_name} ${memory.last_name} on Fojourn!`;
        const url = `${baseUrl}/u/${memory.username}/memory/${slug}`;

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    
    <!-- Open Graph meta tags for Facebook sharing -->
    <meta property="og:url" content="${url}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="Fojourn - Travel Memory Journal" />
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${url}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
    
    <title>${title}</title>
</head>
<body>
    <h1>${title}</h1>
    <p>${description}</p>
    ${media.length > 0 ? `<img src="${imageUrl}" alt="${title}" style="max-width: 100%; height: auto;" />` : ''}
    <p><a href="${url}">View this travel memory</a></p>
</body>
</html>`;

        return res.send(html);
        
      } catch (error) {
        console.error('Error serving meta tags for Facebook bot:', error);
        return next(); // Fall back to React app
      }
    }
    
    // For non-Facebook bots and humans, check if we should redirect to canonical URL
    if (!isFacebookBot) {
      try {
        const { username, slug } = req.params;
        const { pool } = require('./config/database');
        
        // Check if user has a public_username and we're using the old username format
        const [users] = await pool.execute(`
          SELECT username, public_username
          FROM users 
          WHERE (username = ? OR public_username = ?) AND profile_public = 1
        `, [username, username]);

        if (users.length > 0) {
          const user = users[0];
          // If user has a public_username and we're accessing via old username, redirect
          if (user.public_username && username === user.username) {
            const canonicalUrl = `/u/${user.public_username}/memory/${slug}`;
            console.log(`🔄 Redirecting to canonical URL: ${canonicalUrl}`);
            return res.redirect(301, canonicalUrl);
          }
        }
      } catch (error) {
        console.error('Error checking for redirect:', error);
        // Continue to serve React app if redirect check fails
      }
    }
    
    // For non-Facebook bots and humans, serve the React app
    next();
  });
  
  // Special middleware to handle Facebook bot requests for blog posts
  // This MUST come BEFORE the static file middleware
  app.get('/blog/:slug', async (req, res, next) => {
    const userAgent = req.get('User-Agent') || '';
    const isFacebookBot = userAgent.includes('facebookexternalhit') || 
                          userAgent.includes('facebookcatalog') || 
                          userAgent.includes('Facebot');
    
    console.log('=== BLOG POST REQUEST ===');
    console.log('URL:', req.url);
    console.log('User-Agent:', userAgent);
    console.log('Is Facebook Bot:', isFacebookBot);
    console.log('Slug:', req.params.slug);
    
    // If it's Facebook bot, serve meta tags instead of React app
    if (isFacebookBot) {
      console.log('🤖 Facebook bot detected for blog post - serving meta tags');
      try {
        const { slug } = req.params;
        const { pool } = require('./config/database');
        
        // Get blog post data
        const [posts] = await pool.execute(`
          SELECT 
            bp.*,
            u.username as author_name,
            u.first_name,
            u.last_name
          FROM blog_posts bp
          JOIN users u ON bp.author_id = u.id
          WHERE bp.slug = ? AND bp.status = 'published'
        `, [slug]);

        if (posts.length === 0) {
          console.log('❌ Blog post not found for slug:', slug);
          return next(); // Fall back to React app (which will show 404)
        }

        const post = posts[0];
        console.log('✅ Found blog post:', post.title);
        console.log('Hero image filename:', post.hero_image_filename);
        
        const baseUrl = 'https://fojourn.site';
        
        // Determine hero image URL
        let imageUrl = `${baseUrl}/fojourn-icon.png`; // Default fallback
        if (post.hero_image_filename) {
          // Use the existing blog image route with optimized prefix
          imageUrl = `${baseUrl}/api/blog/image/optimized-${post.hero_image_filename}`;
          console.log('🖼️ Using blog hero image:', imageUrl);
        } else {
          console.log('📷 No hero image, using default:', imageUrl);
        }

        const title = `${post.title} | Fojourn Travel Blog`;
        const description = post.seo_description || post.excerpt || 
          `Read this amazing travel story by ${post.first_name} ${post.last_name}. Discover new destinations and travel inspiration on Fojourn.`;
        const url = `${baseUrl}/blog/${slug}`;

        console.log('📋 Generated blog meta data:');
        console.log('- Title:', title);
        console.log('- Description:', description);
        console.log('- Image URL:', imageUrl);
        console.log('- Blog URL:', url);

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    
    <!-- Open Graph meta tags for Facebook sharing -->
    <meta property="og:url" content="${url}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="Fojourn - Travel Blog" />
    
    <!-- Article specific meta tags -->
    <meta property="article:author" content="${post.first_name} ${post.last_name}" />
    <meta property="article:published_time" content="${post.published_at}" />
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${url}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
    
    <title>${title}</title>
    
    <!-- Auto-redirect for human users -->
    <script>
        // Only redirect humans, not bots
        const userAgent = navigator.userAgent.toLowerCase();
        const isBot = /bot|crawler|spider|facebook|twitter|linkedin|whatsapp|telegram/i.test(userAgent);
        
        if (!isBot && typeof window !== 'undefined') {
            // Redirect to React app after a short delay to ensure meta tags are read
            setTimeout(() => {
                window.location.href = '${url}';
            }, 100);
        }
    </script>
</head>
<body>
    <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
        <h1>${post.title}</h1>
        ${post.hero_image_filename ? `<img src="${imageUrl}" alt="${post.title}" style="max-width: 100%; height: auto; border-radius: 8px;" />` : ''}
        <p>${description}</p>
        <p><a href="${url}">Read the full blog post</a></p>
    </div>
</body>
</html>`;

        return res.send(html);
        
      } catch (error) {
        console.error('Error serving blog meta tags:', error);
        return next(); // Fall back to React app
      }
    }
    
    // For non-Facebook bots and humans, serve the React app
    next();
  });
  
  // Serve static files from the React app build directory
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  // Handle React routing - send all non-API requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
const startServer = async () => {
  try {
    await testConnection();
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Signal to PM2 that the app is ready
      if (process.send) {
        process.send('ready');
        console.log('Ready signal sent to PM2');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;


