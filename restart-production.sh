#!/bin/bash

# Quick restart script for production server
echo "=== FOJOURN PRODUCTION RESTART ==="

# Navigate to project directory
cd ~/fojourn.site/fojournapp

# Pull latest changes
echo "Pulling latest changes..."
git pull origin master

# Install any new dependencies
echo "Installing dependencies..."
cd backend && npm install --production && cd ..

# Restart PM2 process
echo "Restarting PM2 process..."
pm2 restart fojourn-travel-log

# Wait a moment for startup
sleep 5

# Check status
echo "=== CURRENT STATUS ==="
pm2 status
echo ""
echo "=== RECENT LOGS ==="
pm2 logs fojourn-travel-log --lines 10

echo ""
echo "=== TESTING API ==="
echo "Testing auth endpoint..."
curl -s -o /dev/null -w "%{http_code}" https://fojourn.site/api/auth/me || echo "API test failed"

echo ""
echo "=== RESTART COMPLETE ==="
