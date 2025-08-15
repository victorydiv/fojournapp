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
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
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

# Check if we need to rebuild by comparing git changes
NEED_REBUILD=false

# Check if build directory exists
if [[ ! -d "build" ]]; then
    log "No build directory found, building..."
    NEED_REBUILD=true
# Check if there are frontend changes since last build
elif [[ -f "build/.git-hash" ]]; then
    LAST_BUILD_HASH=$(cat build/.git-hash 2>/dev/null || echo "")
    CURRENT_HASH=$(git rev-parse HEAD)
    if [[ "$LAST_BUILD_HASH" != "$CURRENT_HASH" ]]; then
        # Check if there are changes in frontend files
        if git diff --name-only $LAST_BUILD_HASH..HEAD | grep -E '^frontend/' > /dev/null 2>&1; then
            log "Frontend code changes detected, rebuilding..."
            NEED_REBUILD=true
        else
            log "No frontend changes since last build, skipping rebuild..."
        fi
    else
        log "No git changes since last build, skipping rebuild..."
    fi
else
    log "No build hash found, rebuilding..."
    NEED_REBUILD=true
fi

if [[ "$NEED_REBUILD" == "true" ]]; then
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
    
    # Save the current git hash for future comparison
    git rev-parse HEAD > build/.git-hash
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
