#!/bin/bash

# Production Deployment and Monitoring Setup Script
# Run this on your production server to ensure proper PM2 configuration

set -e  # Exit on any error

APP_NAME="fojourn-travel-log"
LOG_DIR="./logs"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Setting up Fojourn production deployment with enhanced monitoring..."

# Create logs directory if it doesn't exist
if [ ! -d "$LOG_DIR" ]; then
    mkdir -p "$LOG_DIR"
    echo "✅ Created logs directory"
fi

# Ensure logs directory has proper permissions
chmod 755 "$LOG_DIR"
touch "$LOG_DIR/err.log" "$LOG_DIR/out.log" "$LOG_DIR/combined.log"
chmod 644 "$LOG_DIR"/*.log

# Install PM2 globally if not already installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
else
    echo "✅ PM2 is already installed"
fi

# Stop existing processes
echo "🛑 Stopping existing PM2 processes..."
pm2 stop "$APP_NAME" 2>/dev/null || echo "No existing process to stop"
pm2 delete "$APP_NAME" 2>/dev/null || echo "No existing process to delete"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend && npm install --production

# Start the application with enhanced configuration
echo "🚀 Starting application with PM2..."
cd ..
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
echo "⚙️ Setting up PM2 startup script..."
pm2 startup

echo ""
echo "⚠️  IMPORTANT: Copy and run the PM2 startup command shown above as root/sudo"
echo "   Then run: pm2 save"
echo ""

# Setup log rotation to prevent disk space issues
echo "📋 Setting up log rotation..."
pm2 install pm2-logrotate
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat 'YYYY-MM-DD_HH-mm-ss'
pm2 set pm2-logrotate:max_size 10M

# Make health monitor script executable
if [ -f "health-monitor.sh" ]; then
    chmod +x health-monitor.sh
    echo "✅ Made health monitor script executable"
fi

# Test the deployment
echo "🧪 Testing deployment..."
sleep 10

# Check if the app is running
if pm2 list | grep -q "$APP_NAME.*online"; then
    echo "✅ Application is running"
else
    echo "❌ Application failed to start"
    pm2 logs "$APP_NAME" --lines 20
    exit 1
fi

# Test health endpoint
if curl -f -s http://127.0.0.1:3000/health > /dev/null; then
    echo "✅ Health endpoint is responding"
else
    echo "⚠️  Health endpoint is not responding yet (may need more time)"
fi

echo ""
echo "🎉 Production deployment complete!"
echo ""
echo "📊 Next steps:"
echo "1. Run the PM2 startup command as root/sudo (shown above)"
echo "2. Run: pm2 save"
echo "3. Setup health monitoring: ./health-monitor.sh setup-cron"
echo "4. Test health monitoring: ./health-monitor.sh test-health"
echo ""
echo "📋 Useful commands:"
echo "  pm2 status              - Check application status"
echo "  pm2 logs $APP_NAME      - View application logs"
echo "  pm2 monit               - Real-time monitoring"
echo "  ./health-monitor.sh status - Check health status"
echo ""
