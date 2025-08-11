const express = require('express');
const app = express();

// Railway typically sets PORT environment variable
const PORT = process.env.PORT || 3001;

console.log('Starting minimal test server...');
console.log('Environment variables:');
console.log('- PORT:', PORT);
console.log('- NODE_ENV:', process.env.NODE_ENV);

app.get('/api/health', (req, res) => {
  console.log('Health check endpoint hit');
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV || 'not set'
  });
});

app.get('/', (req, res) => {
  console.log('Root endpoint hit');
  res.json({ 
    message: 'Travel Log API - Minimal Test Server',
    status: 'running',
    port: PORT
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Minimal test server running on 0.0.0.0:${PORT}`);
  console.log(`✅ Server startup successful at ${new Date().toISOString()}`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

module.exports = app;
