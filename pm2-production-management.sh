#!/bin/bash

# PM2 Production Management Script for Fojourn Travel Log
# This script helps manage your backend in production with automatic restarts

echo "=== PM2 Production Management for Fojourn Travel Log ==="

# Function to display current PM2 status
check_status() {
    echo "📊 Current PM2 Status:"
    pm2 status
    echo ""
    pm2 info fojourn-travel-log
}

# Function to start the application with ecosystem config
start_app() {
    echo "🚀 Starting Fojourn Travel Log with PM2..."
    pm2 start ecosystem.config.js --env production
    pm2 save
    echo "✅ Application started and configuration saved"
}

# Function to restart the application
restart_app() {
    echo "🔄 Restarting Fojourn Travel Log..."
    pm2 restart fojourn-travel-log
    echo "✅ Application restarted"
}

# Function to stop the application
stop_app() {
    echo "⏹️ Stopping Fojourn Travel Log..."
    pm2 stop fojourn-travel-log
    echo "✅ Application stopped"
}

# Function to delete the application from PM2
delete_app() {
    echo "🗑️ Removing Fojourn Travel Log from PM2..."
    pm2 delete fojourn-travel-log
    pm2 save
    echo "✅ Application removed from PM2"
}

# Function to view logs
view_logs() {
    echo "📋 Viewing logs for Fojourn Travel Log..."
    echo "Press Ctrl+C to exit log view"
    pm2 logs fojourn-travel-log --lines 50
}

# Function to view error logs only
view_error_logs() {
    echo "❌ Viewing error logs for Fojourn Travel Log..."
    pm2 logs fojourn-travel-log --err --lines 50
}

# Function to monitor application
monitor_app() {
    echo "📈 Opening PM2 monitoring dashboard..."
    pm2 monit
}

# Function to setup PM2 startup script
setup_startup() {
    echo "⚙️ Setting up PM2 to start automatically on server boot..."
    pm2 startup
    echo ""
    echo "⚠️ IMPORTANT: Copy and run the command shown above as root/sudo"
    echo "Then run: pm2 save"
}

# Function to flush logs
flush_logs() {
    echo "🧹 Flushing PM2 logs..."
    pm2 flush
    echo "✅ Logs flushed"
}

# Function to show monitoring commands
show_monitoring() {
    echo "📊 PM2 Monitoring Commands:"
    echo ""
    echo "Check status:           pm2 status"
    echo "View logs:              pm2 logs fojourn-travel-log"
    echo "View error logs:        pm2 logs fojourn-travel-log --err"
    echo "Monitor resources:      pm2 monit"
    echo "Restart app:            pm2 restart fojourn-travel-log"
    echo "Reload with zero downtime: pm2 reload fojourn-travel-log"
    echo "Stop app:               pm2 stop fojourn-travel-log"
    echo "Delete app:             pm2 delete fojourn-travel-log"
    echo ""
    echo "📈 Useful monitoring:"
    echo "Show app info:          pm2 info fojourn-travel-log"
    echo "Show process list:      pm2 list"
    echo "Flush logs:             pm2 flush"
    echo "Reset restart counter:  pm2 reset fojourn-travel-log"
}

# Main menu
case "$1" in
    "start")
        start_app
        ;;
    "restart")
        restart_app
        ;;
    "stop")
        stop_app
        ;;
    "delete")
        delete_app
        ;;
    "status")
        check_status
        ;;
    "logs")
        view_logs
        ;;
    "errors")
        view_error_logs
        ;;
    "monitor")
        monitor_app
        ;;
    "startup")
        setup_startup
        ;;
    "flush")
        flush_logs
        ;;
    "commands")
        show_monitoring
        ;;
    *)
        echo "Usage: $0 {start|restart|stop|delete|status|logs|errors|monitor|startup|flush|commands}"
        echo ""
        echo "Commands:"
        echo "  start    - Start the application with PM2"
        echo "  restart  - Restart the application"
        echo "  stop     - Stop the application"
        echo "  delete   - Remove application from PM2"
        echo "  status   - Show current PM2 status"
        echo "  logs     - View application logs"
        echo "  errors   - View error logs only"
        echo "  monitor  - Open PM2 monitoring dashboard"
        echo "  startup  - Setup PM2 to start on server boot"
        echo "  flush    - Clear all logs"
        echo "  commands - Show all PM2 monitoring commands"
        echo ""
        echo "Examples:"
        echo "  ./pm2-production-management.sh start"
        echo "  ./pm2-production-management.sh status"
        echo "  ./pm2-production-management.sh logs"
        ;;
esac
