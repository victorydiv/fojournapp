#!/bin/bash

# DreamHost No-Sudo Deployment Script
# Simple deployment script that works without sudo access

APP_NAME="fojourn-travel-log"
USER_HOME="$HOME"

echo "🚀 DreamHost No-Sudo Deployment for Fojourn"
echo "📝 This script avoids all sudo commands"

# Install PM2 locally if not present
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 locally..."
    npm install -g pm2 --prefix="$USER_HOME/.local"
    export PATH="$USER_HOME/.local/bin:$PATH"
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$USER_HOME/.bashrc"
fi

# Ensure PM2 is in PATH
export PATH="$USER_HOME/.local/bin:$PATH"

# Stop and restart the application
echo "🔄 Restarting application..."
pm2 stop "$APP_NAME" 2>/dev/null || true
pm2 delete "$APP_NAME" 2>/dev/null || true

# Install dependencies
cd backend && npm install --production && cd ..

# Start with new configuration
pm2 start ecosystem.config.js --env production
pm2 save

# Create simple health check script
cat > "$USER_HOME/simple-health-check.sh" << 'EOF'
#!/bin/bash
export PATH="$HOME/.local/bin:$PATH"
if ! curl -f -s http://127.0.0.1:3000/health > /dev/null; then
    cd "$HOME/fojourn.site"  # Adjust this path
    pm2 restart fojourn-travel-log || pm2 start ecosystem.config.js --env production
    pm2 save
fi
EOF

chmod +x "$USER_HOME/simple-health-check.sh"

# Add to crontab (user-level only)
(crontab -l 2>/dev/null; echo "*/10 * * * * $USER_HOME/simple-health-check.sh >/dev/null 2>&1") | crontab -

echo "✅ Deployment complete!"
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "🔧 No sudo commands used!"
echo "📅 Health check runs every 10 minutes via user crontab"
echo "🏥 Test health: curl http://127.0.0.1:3000/health"
