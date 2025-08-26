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
const metaRoutes = require('./routes/meta');

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
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 300, // Increased from 100 to 300
  message: 'Too many requests from this IP, please try again later.'
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
app.use('/api/meta', metaRoutes);

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

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  
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
        
        // Get memory data
        const { pool } = require('./config/database');
        const [memories] = await pool.execute(`
          SELECT 
            te.*,
            u.username,
            u.first_name,
            u.last_name,
            u.avatar_filename
          FROM travel_entries te
          JOIN users u ON te.user_id = u.id
          WHERE te.public_slug = ? AND te.is_public = 1 AND u.profile_public = 1 AND u.username = ?
        `, [slug, username]);

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
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;


