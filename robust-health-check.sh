#!/bin/bash

# Robust health check script that handles PM2 daemon issues
# Checks backend health and restarts if down, with PM2 daemon recovery

BACKEND_URL="http://127.0.0.1:3000"
LOG_FILE="$HOME/fojourn-health.log"
APP_NAME="fojourn-travel-log"
PROJECT_DIR="$HOME"

# Function to log with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to safely execute PM2 commands with error handling
safe_pm2_command() {
    local cmd="$1"
    local description="$2"
    
    log_message "🔧 Executing: $description"
    
    # Try the command with timeout
    if timeout 30s bash -c "$cmd" >> "$LOG_FILE" 2>&1; then
        log_message "✅ $description: SUCCESS"
        return 0
    else
        log_message "❌ $description: FAILED or TIMED OUT"
        return 1
    fi
}

# Function to reset PM2 daemon
reset_pm2_daemon() {
    log_message "🔄 Resetting PM2 daemon due to communication issues..."
    
    # Kill all PM2 processes
    safe_pm2_command "pm2 kill" "PM2 kill command"
    
    # Wait a moment
    sleep 5
    
    # Clear PM2 logs and cache
    rm -rf ~/.pm2/logs/* 2>/dev/null
    rm -rf ~/.pm2/pids/* 2>/dev/null
    
    log_message "🧹 Cleared PM2 logs and PIDs"
    
    # Restart PM2 daemon
    safe_pm2_command "pm2 ping" "PM2 daemon restart"
}

# Function to check PM2 daemon health
check_pm2_daemon() {
    log_message "🔍 Checking PM2 daemon health..."
    
    # Test if PM2 daemon is responsive
    if timeout 10s pm2 ping >/dev/null 2>&1; then
        log_message "✅ PM2 daemon is responsive"
        return 0
    else
        log_message "❌ PM2 daemon is not responsive"
        return 1
    fi
}

# Function to start application with error handling
start_application() {
    log_message "🚀 Starting application..."
    
    # Ensure we're in the right directory
    cd "$PROJECT_DIR" || {
        log_message "❌ Failed to change to project directory: $PROJECT_DIR"
        return 1
    }
    
    # Check if ecosystem config exists
    if [ ! -f "ecosystem.config.js" ]; then
        log_message "❌ ecosystem.config.js not found in $PROJECT_DIR"
        return 1
    fi
    
    # Start with PM2
    if safe_pm2_command "pm2 start ecosystem.config.js --env production" "PM2 start application"; then
        log_message "✅ Application started successfully"
        return 0
    else
        log_message "❌ Failed to start application with PM2"
        return 1
    fi
}

# Function to restart application with escalating strategies
restart_application() {
    log_message "🔄 Attempting to restart application..."
    
    # Strategy 1: Simple PM2 restart
    if safe_pm2_command "pm2 restart $APP_NAME" "PM2 restart"; then
        return 0
    fi
    
    # Strategy 2: Stop and start
    log_message "🔄 Trying stop/start method..."
    safe_pm2_command "pm2 stop $APP_NAME" "PM2 stop"
    sleep 5
    if safe_pm2_command "pm2 start ecosystem.config.js --env production" "PM2 start after stop"; then
        return 0
    fi
    
    # Strategy 3: Reset PM2 daemon and restart
    log_message "🔄 Resetting PM2 daemon and restarting..."
    reset_pm2_daemon
    sleep 10
    if start_application; then
        return 0
    fi
    
    # Strategy 4: Direct node.js start (fallback)
    log_message "🔄 Attempting direct Node.js start as fallback..."
    cd "$PROJECT_DIR/backend" || return 1
    
    # Kill any existing node processes for this app
    pkill -f "node.*server.js" 2>/dev/null
    
    # Start directly with nohup
    if nohup node server.js > "$LOG_FILE.direct" 2>&1 & then
        log_message "✅ Started application directly with Node.js"
        return 0
    else
        log_message "❌ Failed to start application directly"
        return 1
    fi
}

# Main health check logic
log_message "🏥 Starting health check..."

# First check PM2 daemon health
if ! check_pm2_daemon; then
    reset_pm2_daemon
fi

# Check if backend is responding
log_message "🔍 Checking backend health at $BACKEND_URL/health"
http_response=$(curl -s --connect-timeout 10 --max-time 30 -w "%{http_code}" "$BACKEND_URL/health" 2>/dev/null)
http_code="${http_response: -3}"

if [ "$http_code" = "200" ]; then
    log_message "✅ Backend health check: PASS (HTTP $http_code)"
    
    # Also verify PM2 status if possible
    if check_pm2_daemon; then
        pm2_info=$(pm2 jlist 2>/dev/null | jq -r ".[] | select(.name==\"$APP_NAME\") | .pm2_env.status" 2>/dev/null)
        if [ -n "$pm2_info" ]; then
            log_message "📊 PM2 Status: $pm2_info"
        fi
    fi
else
    log_message "❌ Backend health check: FAIL (HTTP Code: $http_code)"
    
    # Log system information
    log_message "📊 System Info:"
    log_message "Memory: $(free -h | grep '^Mem:' | awk '{print $3 "/" $2}' 2>/dev/null || echo 'N/A')"
    log_message "CPU Load: $(uptime | awk -F'load average:' '{print $2}' 2>/dev/null || echo 'N/A')"
    log_message "Disk Space: $(df -h / | tail -1 | awk '{print $4 " available"}' 2>/dev/null || echo 'N/A')"
    
    # Attempt restart
    if restart_application; then
        log_message "⏰ Waiting 30 seconds for application to stabilize..."
        sleep 30
        
        # Final health check
        final_response=$(curl -s --connect-timeout 10 --max-time 30 -w "%{http_code}" "$BACKEND_URL/health" 2>/dev/null)
        final_code="${final_response: -3}"
        
        if [ "$final_code" = "200" ]; then
            log_message "✅ Application successfully recovered (HTTP $final_code)"
        else
            log_message "❌ CRITICAL: Application failed to recover after restart (HTTP Code: $final_code)"
            log_message "🚨 MANUAL INTERVENTION REQUIRED"
        fi
    else
        log_message "❌ CRITICAL: All restart strategies failed"
        log_message "🚨 MANUAL INTERVENTION REQUIRED"
    fi
fi

log_message "🏁 Health check completed"
