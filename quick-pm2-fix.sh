#!/bin/bash

# Quick PM2 Fix Commands
# Run these commands on your server to fix the EPIPE error

echo "🔧 Fixing PM2 EPIPE error..."

# Step 1: Kill PM2 daemon completely
echo "Step 1: Killing PM2 daemon..."
pm2 kill

# Step 2: Clean up PM2 files
echo "Step 2: Cleaning PM2 files..."
rm -rf ~/.pm2/logs/*
rm -rf ~/.pm2/pids/*
rm -rf ~/.pm2/dump.pm2
rm -f ~/.pm2/rpc.sock
rm -f ~/.pm2/pub.sock

# Step 3: Restart PM2 daemon
echo "Step 3: Restarting PM2 daemon..."
pm2 ping

# Step 4: Start your application
echo "Step 4: Starting application..."
cd ~/
pm2 start ecosystem.config.js --env production

# Step 5: Check status
echo "Step 5: Checking status..."
pm2 status

echo "✅ PM2 recovery complete!"
echo "Now run: ./simple-health-check.sh"
