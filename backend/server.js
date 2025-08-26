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


