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

# Function to check and fix PM2 version issues
check_pm2_health() {
    local pm2_cmd="$1"
    
    log_message "🔍 Checking PM2 health..."
    
    # Try to get PM2 version - this often fails with version mismatches
    if ! $pm2_cmd --version &> /dev/null; then
        log_message "⚠️ PM2 version command failed - possible version mismatch"
        return 1
    fi
    
    # Try to list processes - this is where version mismatches usually show up
    local list_output
    list_output=$($pm2_cmd list 2>&1)
    local list_exit_code=$?
    
    if [ $list_exit_code -ne 0 ]; then
        log_message "⚠️ PM2 list command failed: $list_output"
        
        # Check for specific version mismatch errors
        if echo "$list_output" | grep -qi "version"; then
            log_message "🔧 Detected PM2 version mismatch - attempting to fix..."
            return 1
        fi
        
        # Check for daemon connection issues
        if echo "$list_output" | grep -qi "daemon\|connect"; then
            log_message "🔧 Detected PM2 daemon issues - attempting to fix..."
            return 1
        fi
        
        return 1
    fi
    
    log_message "✅ PM2 health check passed"
    return 0
}

# Function to fix PM2 issues
fix_pm2_issues() {
    local pm2_cmd="$1"
    
    log_message "🔧 Attempting to fix PM2 issues..."
    
    # Step 1: Kill PM2 daemon to force fresh start
    log_message "🔄 Killing PM2 daemon..."
    $pm2_cmd kill >> "$LOG_FILE" 2>&1
    sleep 5
    
    # Step 2: Update PM2 to latest version if using global PM2
    if [ "$pm2_cmd" = "pm2" ]; then
        log_message "🔄 Updating PM2 to latest version..."
        if command -v npm &> /dev/null; then
            npm install -g pm2@latest >> "$LOG_FILE" 2>&1
            log_message "✅ PM2 update completed"
        else
            log_message "⚠️ npm not found - skipping PM2 update"
        fi
    fi
    
    # Step 3: Clean up PM2 directories if they exist
    if [ -d "$HOME/.pm2" ]; then
        log_message "🧹 Cleaning up PM2 directories..."
        rm -rf "$HOME/.pm2/logs/*" >> "$LOG_FILE" 2>&1
        rm -f "$HOME/.pm2/pm2.pid" >> "$LOG_FILE" 2>&1
        rm -f "$HOME/.pm2/rpc.sock" >> "$LOG_FILE" 2>&1
        rm -f "$HOME/.pm2/pub.sock" >> "$LOG_FILE" 2>&1
    fi
    
    # Step 4: Start fresh PM2 daemon
    log_message "🔄 Starting fresh PM2 daemon..."
    $pm2_cmd ping >> "$LOG_FILE" 2>&1
    
    # Step 5: Verify PM2 is working
    if check_pm2_health "$pm2_cmd"; then
        log_message "✅ PM2 fix successful"
        return 0
    else
        log_message "❌ PM2 fix failed"
        return 1
    fi
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
        
        # Check PM2 health first
        if ! check_pm2_health "$PM2_CMD"; then
            log_message "⚠️ PM2 health check failed - attempting to fix..."
            if ! fix_pm2_issues "$PM2_CMD"; then
                log_message "❌ Failed to fix PM2 issues - falling back to direct Node.js start"
                PM2_CMD=""
            else
                log_message "✅ PM2 issues resolved successfully"
            fi
        fi
        
        # Only proceed with PM2 if it's healthy
        if [ -n "$PM2_CMD" ]; then
            # Change to app directory
            cd "$APP_DIR" || { log_message "❌ Failed to change to app directory"; exit 1; }
            
            # Check if PM2 has any processes running
            if $PM2_CMD list | grep -q "fojourn-travel-log"; then
                log_message "🔄 Found existing PM2 process, attempting restart..."
                $PM2_CMD restart ecosystem.config.js >> "$LOG_FILE" 2>&1
            else
                log_message "🆕 No PM2 processes found, starting fresh..."
                $PM2_CMD start ecosystem.config.js >> "$LOG_FILE" 2>&1
            fi
        fi
        
        # Check if PM2 command was executed successfully
        if [ -n "$PM2_CMD" ]; then
            if [ $? -eq 0 ]; then
                log_message "🔄 PM2 command executed successfully"
                sleep 30
                
                # Check if start/restart was successful
                if curl -s --connect-timeout 10 --max-time 30 "$BACKEND_URL/health" > /dev/null 2>&1; then
                    log_message "✅ Backend start/restart successful"
                else
                    log_message "❌ Backend still down after PM2 attempt - cleaning up and trying direct start"
                    
                    # Clean up the failed PM2 process to avoid conflicts
                    $PM2_CMD delete fojourn-travel-log >> "$LOG_FILE" 2>&1
                    log_message "🧹 Cleaned up failed PM2 process"
                    
                    # Set PM2_CMD to empty to trigger direct start
                    PM2_CMD=""
                fi
            else
                log_message "❌ PM2 command failed - cleaning up and trying direct Node.js start"
                
                # Clean up any broken PM2 processes
                $PM2_CMD delete fojourn-travel-log >> "$LOG_FILE" 2>&1
                log_message "🧹 Cleaned up failed PM2 process"
                
                # Set PM2_CMD to empty to trigger direct start
                PM2_CMD=""
            fi
        fi
        
        # If PM2 failed or was disabled, try direct Node.js start
        if [ -z "$PM2_CMD" ]; then
            log_message "🔄 Falling back to direct Node.js start"
            
            # Fallback to direct Node.js start
            cd "$APP_DIR/backend" || { log_message "❌ Failed to change to backend directory"; exit 1; }
            nohup node server.js > ../logs/backend.log 2>&1 &
            log_message "🔄 Started backend directly with Node.js as fallback"
            
            sleep 30
            if curl -s --connect-timeout 10 --max-time 30 "$BACKEND_URL/health" > /dev/null 2>&1; then
                log_message "✅ Backend direct start successful"
            else
                log_message "❌ All restart attempts failed"
            fi
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
