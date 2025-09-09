#!/bin/bash

# PM2 Recovery Script
# Fixes PM2 daemon issues and restarts the application

APP_NAME="fojourn-travel-log"
PROJECT_DIR="$HOME"
LOG_FILE="$HOME/pm2-recovery.log"

# Function to log with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_message "🔧 Starting PM2 recovery process..."

# Step 1: Kill all PM2 processes
log_message "🛑 Killing all PM2 processes..."
pm2 kill 2>/dev/null || {
    log_message "⚠️  PM2 kill failed, trying alternative method..."
    pkill -f "PM2" 2>/dev/null
    pkill -f "pm2" 2>/dev/null
}

# Step 2: Clean up PM2 files
log_message "🧹 Cleaning up PM2 files..."
rm -rf ~/.pm2/logs/* 2>/dev/null
rm -rf ~/.pm2/pids/* 2>/dev/null
rm -rf ~/.pm2/dump.pm2 2>/dev/null
rm -rf /tmp/pm2-* 2>/dev/null

# Step 3: Clear any socket files
log_message "🧹 Clearing socket files..."
rm -f ~/.pm2/rpc.sock 2>/dev/null
rm -f ~/.pm2/pub.sock 2>/dev/null

# Step 4: Wait for cleanup
log_message "⏰ Waiting for cleanup to complete..."
sleep 5

# Step 5: Restart PM2 daemon
log_message "🔄 Restarting PM2 daemon..."
if pm2 ping; then
    log_message "✅ PM2 daemon restarted successfully"
else
    log_message "❌ PM2 daemon restart failed"
    exit 1
fi

# Step 6: Change to project directory
log_message "📁 Changing to project directory: $PROJECT_DIR"
cd "$PROJECT_DIR" || {
    log_message "❌ Failed to change to project directory"
    exit 1
}

# Step 7: Verify ecosystem config exists
if [ ! -f "ecosystem.config.js" ]; then
    log_message "❌ ecosystem.config.js not found in $PROJECT_DIR"
    exit 1
fi

# Step 8: Start application
log_message "🚀 Starting application..."
if pm2 start ecosystem.config.js --env production; then
    log_message "✅ Application started successfully"
else
    log_message "❌ Failed to start application"
    exit 1
fi

# Step 9: Show status
log_message "📊 Current PM2 status:"
pm2 status

# Step 10: Test health endpoint
log_message "🏥 Testing health endpoint..."
sleep 10

health_response=$(curl -s --connect-timeout 10 --max-time 30 -w "%{http_code}" "http://127.0.0.1:3000/health" 2>/dev/null)
health_code="${health_response: -3}"

if [ "$health_code" = "200" ]; then
    log_message "✅ Health check passed (HTTP $health_code)"
    log_message "🎉 PM2 recovery completed successfully!"
else
    log_message "❌ Health check failed (HTTP Code: $health_code)"
    log_message "🔍 Recent logs:"
    pm2 logs "$APP_NAME" --lines 20 --nostream
fi
