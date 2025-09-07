#!/bin/bash

# Simple health check script for cron
# Checks backend health and restarts if down

BACKEND_URL="http://127.0.0.1:3000"
LOG_FILE="$HOME/fojourn-health.log"

# Function to log with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Check if backend is responding
if curl -s --connect-timeout 10 --max-time 30 "$BACKEND_URL/health" > /dev/null 2>&1; then
    log_message "✅ Backend health check: PASS"
else
    log_message "❌ Backend health check: FAIL - Attempting restart..."
    
    # Try to restart with PM2
    if pm2 restart ecosystem.config.js >> "$LOG_FILE" 2>&1; then
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
fi
