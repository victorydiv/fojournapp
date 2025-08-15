#!/bin/bash

# Quick Deploy Script for DreamHost
# Run this after uploading your files to DreamHost

set -e

# Configuration
DOMAIN="fojourn.site"
APP_NAME="fojourn-travel-log"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
title() { echo -e "\n${BLUE}=== $1 ===${NC}\n"; }

title "Quick DreamHost Deployment"

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    warn "Not in project root, navigating to ~/fojourn.site/fojournapp"
    cd ~/fojourn.site/fojournapp
fi

# Install dependencies
title "Installing Dependencies"
log "Backend dependencies..."
cd backend && npm install && cd ..
log "Frontend dependencies..."
cd frontend && npm install && cd ..

# Build frontend (with memory optimization)
title "Building Frontend"
cd frontend

# Check if build exists and is recent
if [[ -d "build" ]] && [[ $(find build -name "*.js" -mtime -1 | wc -l) -gt 0 ]]; then
    log "Recent build found, skipping rebuild..."
else
    log "Cleaning previous build and cache..."
    rm -rf build node_modules/.cache
    
    log "Building frontend with memory optimizations..."
    export NODE_OPTIONS="--max-old-space-size=1024"
    export GENERATE_SOURCEMAP=false
    export CI=false
    
    # Try building with reduced memory usage
    npm run build || {
        error "Build failed due to memory constraints"
        warn "Try using deploy-production.sh for local build + upload"
        exit 1
    }
fi

log "Copying build to web directory..."
cp -r build/* ~/fojourn.site/
cd ..

# Set up directories
title "Setting up Directories"
mkdir -p logs backend/uploads
chmod 755 backend/uploads

# Start with PM2
title "Starting with PM2"

# Check if PM2 is available
if command -v pm2 &> /dev/null; then
    PM2="pm2"
elif command -v npx &> /dev/null; then
    PM2="npx pm2"
else
    log "Installing PM2..."
    npm install pm2
    PM2="npx pm2"
fi

# Stop existing process
$PM2 delete $APP_NAME 2>/dev/null || true

# Start application
if [[ -f "ecosystem.config.js" ]]; then
    $PM2 start ecosystem.config.js --env production
else
    $PM2 start backend/server.js --name $APP_NAME --cwd ./backend
fi

$PM2 save

title "Deployment Complete!"
log "Status:"
$PM2 status
log "Recent logs:"
$PM2 logs $APP_NAME --lines 5
