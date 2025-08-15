#!/bin/bash

# Backend-Only Deployment for DreamHost
# Use this when frontend is already built and deployed

set -e

# Configuration
APP_NAME="fojourn-travel-log"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
title() { echo -e "\n${BLUE}=== $1 ===${NC}\n"; }

title "Backend-Only Deployment"

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    cd ~/fojourn.site/fojournapp
fi

# Install backend dependencies
title "Setting up Backend"
cd backend
log "Installing dependencies..."
npm install --production
cd ..

# Set up directories
log "Setting up directories..."
mkdir -p logs backend/uploads
chmod 755 backend/uploads

# Start with PM2
title "Restarting Application"

# Check PM2 availability
if command -v pm2 &> /dev/null; then
    PM2="pm2"
else
    PM2="npx pm2"
fi

# Stop and restart
$PM2 delete $APP_NAME 2>/dev/null || true

if [[ -f "ecosystem.config.js" ]]; then
    $PM2 start ecosystem.config.js --env production
else
    $PM2 start backend/server.js --name $APP_NAME --cwd ./backend
fi

$PM2 save

title "Backend Deployment Complete!"
$PM2 status
$PM2 logs $APP_NAME --lines 5
