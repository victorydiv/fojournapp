#!/bin/bash

# Health check script for production server
echo "=== FOJOURN PRODUCTION HEALTH CHECK ==="

echo "1. Checking if in correct directory..."
pwd
ls -la

echo "2. Checking Node.js and npm versions..."
node --version
npm --version

echo "3. Checking if backend directory exists..."
ls -la backend/

echo "4. Checking backend dependencies..."
cd backend
if [ -f "package.json" ]; then
    echo "package.json exists"
    npm list --depth=0 2>/dev/null | head -20
else
    echo "ERROR: No package.json found!"
fi

echo "5. Checking for required files..."
echo "server.js exists: $([ -f "server.js" ] && echo "YES" || echo "NO")"
echo "routes/debug.js exists: $([ -f "routes/debug.js" ] && echo "YES" || echo "NO")"
echo ".env exists: $([ -f ".env" ] && echo "YES" || echo "NO")"
echo ".env.production exists: $([ -f ".env.production" ] && echo "YES" || echo "NO")"

echo "6. Testing server startup..."
timeout 5s node -e "
try {
  console.log('Testing requires...');
  require('./routes/debug');
  console.log('Debug route: OK');
  require('./config/database');
  console.log('Database config: OK');
  require('./server.js');
} catch(e) {
  console.error('ERROR:', e.message);
  console.error('Stack:', e.stack);
}
" || echo "Server test failed or timed out"

echo "7. Checking PM2 status..."
pm2 status

echo "8. Recent PM2 logs..."
pm2 logs fojourn-travel-log --lines 20

echo "=== HEALTH CHECK COMPLETE ==="
