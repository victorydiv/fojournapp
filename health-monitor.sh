#!/bin/bash

# Fojourn Backend Health Monitor and Auto-Recovery Script
# This script monitors the backend health and ensures it's always running

LOG_FILE="/tmp/fojourn-health-monitor.log"
BACKEND_URL="http://127.0.0.1:3000"
APP_NAME="fojourn-travel-log"
MAX_DOWNTIME=300  # 5 minutes in seconds
HEALTH_CHECK_INTERVAL=60  # 1 minute

# Function to log with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to check if backend is responding
check_backend_health() {
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 --max-time 30 "$BACKEND_URL/health" 2>/dev/null)
    
    if [ "$http_code" = "200" ]; then
        return 0  # Healthy
    else
        return 1  # Unhealthy
    fi
}

# Function to check if PM2 process is running
check_pm2_process() {
    local status
    status=$(pm2 jlist | jq -r ".[] | select(.name==\"$APP_NAME\") | .pm2_env.status" 2>/dev/null)
    
    if [ "$status" = "online" ]; then
        return 0  # Running
    else
        return 1  # Not running
    fi
}

# Function to restart the backend
restart_backend() {
    log_message "🔄 Attempting to restart backend..."
    
    # First try PM2 restart
    if pm2 restart "$APP_NAME"; then
        log_message "✅ PM2 restart successful"
        sleep 30  # Wait for app to start
        return 0
    fi
    
    # If PM2 restart fails, try stop and start
    log_message "⚠️ PM2 restart failed, trying stop and start..."
    pm2 stop "$APP_NAME"
    sleep 5
    
    if pm2 start ecosystem.config.js --env production; then
        pm2 save
        log_message "✅ PM2 stop/start successful"
        sleep 30
        return 0
    fi
    
    log_message "❌ PM2 restart attempts failed"
    return 1
}

# Function to send alert (you can customize this)
send_alert() {
    local message="$1"
    log_message "🚨 ALERT: $message"
    
    # Add email, Slack, or other notification methods here
    # Example: echo "$message" | mail -s "Fojourn Backend Alert" admin@example.com
}

# Function to get system stats
get_system_stats() {
    local cpu_usage memory_usage disk_usage
    
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    memory_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    log_message "📊 System Stats - CPU: ${cpu_usage}%, Memory: ${memory_usage}%, Disk: ${disk_usage}%"
}

# Function to check PM2 logs for errors
check_recent_errors() {
    local error_count
    error_count=$(pm2 logs "$APP_NAME" --lines 100 --nostream 2>/dev/null | grep -i "error\|exception\|crash" | wc -l)
    
    if [ "$error_count" -gt 5 ]; then
        log_message "⚠️ Found $error_count recent errors in logs"
        return 1
    fi
    
    return 0
}

# Main monitoring function
monitor_backend() {
    local downtime=0
    local consecutive_failures=0
    
    log_message "🔍 Starting backend health monitoring..."
    
    while true; do
        if check_backend_health; then
            if [ $consecutive_failures -gt 0 ]; then
                log_message "✅ Backend is healthy again after $consecutive_failures failures"
                consecutive_failures=0
                downtime=0
            fi
            
            # Periodic health report (every 30 minutes)
            if [ $(($(date +%M) % 30)) -eq 0 ] && [ $(($(date +%S))) -lt 60 ]; then
                log_message "💚 Backend health check: OK"
                get_system_stats
            fi
            
        else
            consecutive_failures=$((consecutive_failures + 1))
            downtime=$((downtime + HEALTH_CHECK_INTERVAL))
            
            log_message "❌ Backend health check failed (attempt $consecutive_failures, downtime: ${downtime}s)"
            
            # Check if PM2 process is still running
            if ! check_pm2_process; then
                log_message "🚨 PM2 process is not running!"
                restart_backend
                consecutive_failures=0
                downtime=0
            elif [ $consecutive_failures -ge 3 ]; then
                log_message "🚨 Backend failed 3 consecutive health checks"
                restart_backend
                consecutive_failures=0
                downtime=0
            fi
            
            # Send alert if downtime exceeds threshold
            if [ $downtime -ge $MAX_DOWNTIME ]; then
                send_alert "Backend has been down for $downtime seconds"
                downtime=0  # Reset to avoid spam
            fi
        fi
        
        # Check for recent errors periodically
        if [ $(($(date +%M) % 15)) -eq 0 ] && [ $(($(date +%S))) -lt 60 ]; then
            check_recent_errors
        fi
        
        sleep $HEALTH_CHECK_INTERVAL
    done
}

# Function to setup cron job for this monitor
setup_cron() {
    local cron_entry script_path
    script_path=$(realpath "$0")
    cron_entry="* * * * * $script_path monitor >/dev/null 2>&1"
    
    # Check if cron job already exists
    if ! crontab -l 2>/dev/null | grep -q "$script_path"; then
        (crontab -l 2>/dev/null; echo "$cron_entry") | crontab -
        log_message "✅ Cron job setup complete"
    else
        log_message "ℹ️ Cron job already exists"
    fi
}

# Function to show current status
show_status() {
    echo "=== Fojourn Backend Status ==="
    echo ""
    
    # PM2 Status
    echo "📊 PM2 Status:"
    pm2 status
    echo ""
    
    # Health Check
    echo "🏥 Health Check:"
    if check_backend_health; then
        echo "✅ Backend is responding"
    else
        echo "❌ Backend is not responding"
    fi
    echo ""
    
    # Recent logs
    echo "📋 Recent Logs (last 10 lines):"
    pm2 logs "$APP_NAME" --lines 10 --nostream
    echo ""
    
    # System stats
    get_system_stats
}

# Main script logic
case "$1" in
    "monitor")
        monitor_backend
        ;;
    "restart")
        restart_backend
        ;;
    "status")
        show_status
        ;;
    "setup-cron")
        setup_cron
        ;;
    "test-health")
        if check_backend_health; then
            echo "✅ Backend health check: PASS"
            exit 0
        else
            echo "❌ Backend health check: FAIL"
            exit 1
        fi
        ;;
    *)
        echo "Fojourn Backend Health Monitor"
        echo ""
        echo "Usage: $0 {monitor|restart|status|setup-cron|test-health}"
        echo ""
        echo "Commands:"
        echo "  monitor     - Start continuous health monitoring"
        echo "  restart     - Manually restart the backend"
        echo "  status      - Show current backend status"
        echo "  setup-cron  - Setup automatic monitoring via cron"
        echo "  test-health - Test backend health once"
        echo ""
        echo "Examples:"
        echo "  $0 status"
        echo "  $0 test-health"
        echo "  $0 restart"
        echo "  nohup $0 monitor > /dev/null 2>&1 &"
        ;;
esac
