#!/bin/bash

# Memory-Optimized Production Deployment for DreamHost
# This script builds locally and deploys only the necessary files

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

title "Memory-Optimized DreamHost Deployment"

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    error "Not in project root directory!"
    exit 1
fi

# Step 1: Build frontend locally with memory limits
title "Building Frontend (Memory Optimized)"
cd frontend

# Clear cache and node_modules to free memory
log "Clearing cache and dependencies..."
rm -rf node_modules/.cache build

# Install dependencies if needed
if [[ ! -d "node_modules" ]]; then
    log "Installing frontend dependencies..."
    npm install
fi

# Build with memory limits and optimizations
log "Building with memory optimizations..."
export NODE_OPTIONS="--max-old-space-size=2048"
export GENERATE_SOURCEMAP=false
export CI=false

# Run the build
npm run build

if [[ ! -d "build" ]]; then
    error "Build failed - no build directory created"
    exit 1
fi

log "Frontend build successful!"
cd ..

# Step 2: Deploy to server
title "Deploying to Production Server"

# Copy built frontend files
log "Copying frontend build to web directory..."
cp -r frontend/build/* ~/fojourn.site/

# Install backend dependencies if needed
title "Setting up Backend"
cd backend

if [[ ! -d "node_modules" ]]; then
    log "Installing backend dependencies..."
    npm install --production
fi

cd ..

# Set up directories
log "Setting up directories..."
mkdir -p logs backend/uploads
chmod 755 backend/uploads

# Start with PM2
title "Starting Application with PM2"

# Check if PM2 is available
if command -v pm2 &> /dev/null; then
    PM2="pm2"
elif command -v npx &> /dev/null; then
    PM2="npx pm2"
else
    log "Installing PM2..."
    npm install pm2 -g
    PM2="pm2"
fi

# Stop existing process
log "Stopping existing application..."
$PM2 delete $APP_NAME 2>/dev/null || true

# Start application
log "Starting application..."
if [[ -f "ecosystem.config.js" ]]; then
    $PM2 start ecosystem.config.js --env production
else
    $PM2 start backend/server.js --name $APP_NAME --cwd ./backend
fi

$PM2 save

title "Deployment Complete!"
log "Application Status:"
$PM2 status
log ""
log "Recent logs:"
$PM2 logs $APP_NAME --lines 10

log ""
log "🎉 Deployment successful!"
log "Your app should be available at: https://$DOMAIN"
log ""
log "Useful commands:"
log "  View logs: pm2 logs $APP_NAME"
log "  Restart: pm2 restart $APP_NAME"
log "  Stop: pm2 stop $APP_NAME"
