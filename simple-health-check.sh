#!/bin/bash

# Simple health check script for cron
# Checks backend health and restarts if down

BACKEND_URL="http://127.0.0.1:3000"
LOG_FILE="$HOME/fojourn-health.log"
APP_NAME="fojourn-travel-log"

# Function to log with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Function to log detailed failure information
log_failure_details() {
    log_message "🔍 FAILURE ANALYSIS:"
    
    # PM2 status
    echo "$(date '+%Y-%m-%d %H:%M:%S') - PM2 Status:" >> "$LOG_FILE"
    pm2 status >> "$LOG_FILE" 2>&1
    
    # Recent error logs
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Recent Error Logs:" >> "$LOG_FILE"
    pm2 logs "$APP_NAME" --err --lines 15 --nostream >> "$LOG_FILE" 2>&1
    
    # System resources
    echo "$(date '+%Y-%m-%d %H:%M:%S') - System Resources:" >> "$LOG_FILE"
    echo "Memory: $(free -h | grep '^Mem:' | awk '{print $3 "/" $2}')" >> "$LOG_FILE"
    echo "CPU Load: $(uptime | awk -F'load average:' '{print $2}')" >> "$LOG_FILE"
    echo "Disk Space: $(df -h / | tail -1 | awk '{print $4 " available"}')" >> "$LOG_FILE"
    
    # Check for specific error patterns in recent logs
    local recent_errors
    recent_errors=$(pm2 logs "$APP_NAME" --err --lines 20 --nostream 2>/dev/null)
    
    if echo "$recent_errors" | grep -qi "econnrefused"; then
        log_message "🔍 Database connection errors detected"
    fi
    if echo "$recent_errors" | grep -qi "enotfound\|getaddrinfo"; then
        log_message "🔍 DNS/Network resolution errors detected"
    fi
    if echo "$recent_errors" | grep -qi "enospc"; then
        log_message "🔍 Disk space errors detected"
    fi
    if echo "$recent_errors" | grep -qi "memory\|heap"; then
        log_message "🔍 Memory errors detected"
    fi
    if echo "$recent_errors" | grep -qi "permission"; then
        log_message "🔍 Permission errors detected"
    fi
    
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ----------------------------------------" >> "$LOG_FILE"
}

# Check if backend is responding
http_response=$(curl -s --connect-timeout 10 --max-time 30 -w "%{http_code}" "$BACKEND_URL/health" 2>/dev/null)
http_code="${http_response: -3}"

if [ "$http_code" = "200" ]; then
    log_message "✅ Backend health check: PASS (HTTP $http_code)"
else
    log_message "❌ Backend health check: FAIL (HTTP Code: $http_code) - Attempting restart..."
    
    # Log detailed failure information before restart attempt
    log_failure_details
    
    # Check if PM2 process is running
    pm2_status=$(pm2 jlist | jq -r ".[] | select(.name==\"$APP_NAME\") | .pm2_env.status" 2>/dev/null)
    log_message "📊 PM2 Process Status: $pm2_status"
    
    # Try to restart with PM2
    log_message "🔄 Executing PM2 restart command..."
    if pm2 restart "$APP_NAME" >> "$LOG_FILE" 2>&1; then
        log_message "✅ PM2 restart command executed successfully"
        sleep 30
        
        # Check if restart was successful
        post_restart_response=$(curl -s --connect-timeout 10 --max-time 30 -w "%{http_code}" "$BACKEND_URL/health" 2>/dev/null)
        post_restart_code="${post_restart_response: -3}"
        
        if [ "$post_restart_code" = "200" ]; then
            log_message "✅ Backend restart successful (HTTP $post_restart_code)"
        else
            log_message "❌ Backend still down after restart (HTTP Code: $post_restart_code)"
            
            # Try alternative restart method
            log_message "🔄 Trying stop/start method..."
            pm2 stop "$APP_NAME" >> "$LOG_FILE" 2>&1
            sleep 5
            pm2 start ecosystem.config.js --env production >> "$LOG_FILE" 2>&1
            sleep 30
            
            # Final health check
            final_response=$(curl -s --connect-timeout 10 --max-time 30 -w "%{http_code}" "$BACKEND_URL/health" 2>/dev/null)
            final_code="${final_response: -3}"
            
            if [ "$final_code" = "200" ]; then
                log_message "✅ Backend recovered with stop/start method (HTTP $final_code)"
            else
                log_message "❌ CRITICAL: Backend failed to recover after all restart attempts (HTTP Code: $final_code)"
                log_message "🚨 MANUAL INTERVENTION REQUIRED"
                
                # Log additional troubleshooting info
                log_message "🔧 Additional troubleshooting info:"
                echo "$(date '+%Y-%m-%d %H:%M:%S') - Node.js version: $(node --version)" >> "$LOG_FILE"
                echo "$(date '+%Y-%m-%d %H:%M:%S') - Working directory: $(pwd)" >> "$LOG_FILE"
                echo "$(date '+%Y-%m-%d %H:%M:%S') - ecosystem.config.js exists: $([ -f ecosystem.config.js ] && echo "YES" || echo "NO")" >> "$LOG_FILE"
                
                # Try direct server test
                if [ -f "backend/server.js" ]; then
                    log_message "🧪 Testing direct server startup:"
                    cd backend
                    timeout 10s node server.js >> "$LOG_FILE" 2>&1 || log_message "Direct startup test failed or timed out"
                    cd ..
                fi
            fi
        fi
    else
        log_message "❌ PM2 restart command failed"
        log_message "🔍 PM2 restart failure details:"
        pm2 logs "$APP_NAME" --err --lines 10 --nostream >> "$LOG_FILE" 2>&1
    fi
fi
