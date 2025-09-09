#!/bin/bash

# Simple health check script for cron
# Checks backend health and restarts if down

# Set PATH to ensure we can find all commands (especially PM2)
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin:$PATH"

BACKEND_URL="http://127.0.0.1:3000"
LOG_FILE="$HOME/fojourn-health.log"
APP_DIR="$HOME/fojourn.site/fojournapp"

# Function to log with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Function to find PM2 command
find_pm2() {
    # Try global PM2 first
    if command -v pm2 &> /dev/null; then
        echo "pm2"
        return 0
    fi
    
    # Try npx PM2
    if command -v npx &> /dev/null; then
        echo "npx pm2"
        return 0
    fi
    
    # Try local PM2 in project
    if [ -f "$APP_DIR/node_modules/.bin/pm2" ]; then
        echo "$APP_DIR/node_modules/.bin/pm2"
        return 0
    fi
    
    return 1
}

# Check if backend is responding
if curl -s --connect-timeout 10 --max-time 30 "$BACKEND_URL/health" > /dev/null 2>&1; then
    log_message "✅ Backend health check: PASS"
else
    log_message "❌ Backend health check: FAIL - Attempting restart..."
    
    # Find PM2 command
    PM2_CMD=$(find_pm2)
    if [ $? -eq 0 ]; then
        log_message "🔍 Using PM2 command: $PM2_CMD"
        
        # Change to app directory
        cd "$APP_DIR" || { log_message "❌ Failed to change to app directory"; exit 1; }
        
        # Try to restart with PM2
        if $PM2_CMD restart ecosystem.config.js >> "$LOG_FILE" 2>&1; then
            log_message "🔄 PM2 restart command executed"
            sleep 30
            
            # Check if restart was successful
            if curl -s --connect-timeout 10 --max-time 30 "$BACKEND_URL/health" > /dev/null 2>&1; then
                log_message "✅ Backend restart successful"
            else
                log_message "❌ Backend still down after restart attempt"
            fi
        else
            log_message "❌ PM2 restart failed"
        fi
    else
        log_message "❌ PM2 command not found - trying direct Node.js start"
        
        # Fallback: try to start directly with Node.js
        cd "$APP_DIR/backend" || { log_message "❌ Failed to change to backend directory"; exit 1; }
        nohup node server.js > ../logs/backend.log 2>&1 &
        log_message "🔄 Started backend directly with Node.js"
        
        sleep 30
        
        # Check if direct start was successful
        if curl -s --connect-timeout 10 --max-time 30 "$BACKEND_URL/health" > /dev/null 2>&1; then
            log_message "✅ Backend direct start successful"
        else
            log_message "❌ Backend still down after direct start attempt"
        fi
    fi
fi
