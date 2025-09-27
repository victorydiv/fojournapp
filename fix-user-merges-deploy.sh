#!/bin/bash
# Quick fix for user_merges table issue in production
# This script applies the database fix and deploys the corrected auth.js

echo "🚀 Applying fix for user_merges table issue..."

# Build the frontend (if needed)
echo "📦 Building frontend..."
cd frontend && npm run build && cd ..

# Copy files to production
echo "📋 Copying files to production..."

# Copy built frontend
rsync -av --delete frontend/build/ victorydiv24@victorydiv24.dreamhost.com:~/fojourn.site/fojournapp/frontend/build/

# Copy backend files
rsync -av backend/ victorydiv24@victorydiv24.dreamhost.com:~/fojourn.site/fojournapp/backend/ \
  --exclude node_modules \
  --exclude .env \
  --exclude "*.log"

# Apply database fix
echo "🗄️ Applying database fix..."
ssh victorydiv24@victorydiv24.dreamhost.com "
  cd ~/fojourn.site/fojournapp
  mysql -u victorydiv24 -p victorydiv24_travel_log2 < database/fix-user-merges-table.sql
"

# Restart the application
echo "🔄 Restarting application..."
ssh victorydiv24@victorydiv24.dreamhost.com "
  cd ~/fojourn.site/fojournapp
  pm2 restart fojourn-travel-log
  pm2 logs fojourn-travel-log --lines 20
"

echo "✅ Fix applied successfully!"
echo "📊 Check the logs to verify the error is resolved."