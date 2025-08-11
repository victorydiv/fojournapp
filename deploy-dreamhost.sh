#!/bin/bash

# DreamHost VPS Deployment Script for Travel Log Application
# This script automates the deployment process

set -e  # Exit on any error

echo "🚀 Starting Travel Log Application Deployment on DreamHost VPS..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration variables
APP_NAME="travel-log"
APP_DIR="/var/www/fojournapp"
DB_NAME="travel_log"
DB_USER="travel_user"
NODE_VERSION="18"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to prompt for input
prompt_input() {
    local prompt="$1"
    local var_name="$2"
    local default="$3"
    
    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " input
        eval $var_name="\${input:-$default}"
    else
        read -p "$prompt: " input
        eval $var_name="$input"
    fi
}

echo "📋 Please provide the following information:"

# Get configuration from user
prompt_input "Domain name (e.g., example.com)" DOMAIN_NAME
prompt_input "Database password for travel_user" DB_PASSWORD
prompt_input "JWT Secret (leave blank to generate)" JWT_SECRET
prompt_input "Google Maps API Key" GOOGLE_MAPS_API_KEY
prompt_input "Your email for SSL certificate" EMAIL

# Generate JWT secret if not provided
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 32)
    print_status "Generated JWT secret"
fi

print_status "Configuration collected. Starting deployment..."

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential packages
print_status "Installing essential packages..."
sudo apt install -y curl wget git nginx mysql-server ufw

# Install Node.js
if ! command_exists node; then
    print_status "Installing Node.js $NODE_VERSION..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    print_status "Node.js already installed: $(node --version)"
fi

# Install PM2
if ! command_exists pm2; then
    print_status "Installing PM2..."
    sudo npm install -g pm2
else
    print_status "PM2 already installed: $(pm2 --version)"
fi

# Configure MySQL
print_status "Configuring MySQL database..."
sudo mysql -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;"
sudo mysql -e "CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';"
sudo mysql -e "GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

# Create application directory
print_status "Setting up application directory..."
if [ ! -d "$APP_DIR" ]; then
    sudo mkdir -p $APP_DIR
    sudo chown -R $USER:$USER $APP_DIR
fi

# Clone or update repository
cd $APP_DIR
if [ -d ".git" ]; then
    print_status "Updating existing repository..."
    git pull origin main || git pull origin master
else
    print_status "Repository should be manually cloned or uploaded to $APP_DIR"
    print_warning "Please ensure your application code is in $APP_DIR before continuing"
    read -p "Press Enter when your code is ready in $APP_DIR..."
fi

# Install dependencies
print_status "Installing application dependencies..."
npm run install-all

# Build frontend
print_status "Building frontend..."
npm run build

# Create environment file
print_status "Creating production environment file..."
cat > backend/.env << EOF
# Production Environment Configuration
NODE_ENV=production
PORT=3001

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

# JWT Secret
JWT_SECRET=$JWT_SECRET

# Google Maps API Key
GOOGLE_MAPS_API_KEY=$GOOGLE_MAPS_API_KEY

# File Upload Settings
MAX_FILE_SIZE=50000000
UPLOAD_PATH=$APP_DIR/backend/uploads
EOF

# Set up uploads directory
print_status "Setting up uploads directory..."
mkdir -p $APP_DIR/backend/uploads
sudo chown -R www-data:www-data $APP_DIR/backend/uploads
chmod 755 $APP_DIR/backend/uploads

# Import database schema
print_status "Setting up database schema..."
if [ -f "database/schema.sql" ]; then
    mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < database/schema.sql
    print_status "Database schema imported successfully"
else
    print_warning "Database schema file not found. Please import manually."
fi

# Configure Nginx
print_status "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/$APP_NAME > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;

    # SSL Configuration (will be updated by Certbot)
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    client_max_body_size 100M;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
if sudo nginx -t; then
    print_status "Nginx configuration is valid"
    sudo systemctl restart nginx
else
    print_error "Nginx configuration is invalid"
    exit 1
fi

# Configure firewall
print_status "Configuring firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow from 127.0.0.1 to any port 3306

# Start application with PM2
print_status "Starting application with PM2..."
cd $APP_DIR/backend

# Stop existing instance if running
pm2 delete $APP_NAME 2>/dev/null || true

# Start application
pm2 start server.js --name $APP_NAME --env production
pm2 save
pm2 startup | tail -1 | sudo bash

# Install SSL certificate
print_status "Installing SSL certificate..."
sudo apt install -y certbot python3-certbot-nginx

print_status "Obtaining SSL certificate..."
sudo certbot --nginx --non-interactive --agree-tos --email $EMAIL -d $DOMAIN_NAME -d www.$DOMAIN_NAME

# Set up automatic renewal
print_status "Setting up SSL certificate auto-renewal..."
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -

# Create backup script
print_status "Setting up backup script..."
sudo tee /usr/local/bin/backup-travel-log.sh > /dev/null << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/$USER/backups"
mkdir -p $BACKUP_DIR

# Database backup
mysqldump -u travel_user -p'$DB_PASSWORD' travel_log > $BACKUP_DIR/travel_log_$DATE.sql

# Files backup
tar -czf $BACKUP_DIR/travel_log_files_$DATE.tar.gz /var/www/fojournapp/backend/uploads/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "travel_log_*" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

sudo chmod +x /usr/local/bin/backup-travel-log.sh

# Add backup to cron (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-travel-log.sh") | crontab -

# Final status check
print_status "Checking application status..."
sleep 5

if pm2 list | grep -q $APP_NAME; then
    print_status "✅ Application is running with PM2"
else
    print_error "❌ Application failed to start"
    pm2 logs $APP_NAME
    exit 1
fi

if sudo systemctl is-active --quiet nginx; then
    print_status "✅ Nginx is running"
else
    print_error "❌ Nginx is not running"
    exit 1
fi

if sudo systemctl is-active --quiet mysql; then
    print_status "✅ MySQL is running"
else
    print_error "❌ MySQL is not running"
    exit 1
fi

print_status "🎉 Deployment completed successfully!"
echo ""
echo "📝 Deployment Summary:"
echo "   - Application URL: https://$DOMAIN_NAME"
echo "   - Application directory: $APP_DIR"
echo "   - Database name: $DB_NAME"
echo "   - Database user: $DB_USER"
echo "   - PM2 process name: $APP_NAME"
echo ""
echo "🔧 Useful commands:"
echo "   - Check application status: pm2 status"
echo "   - View application logs: pm2 logs $APP_NAME"
echo "   - Restart application: pm2 restart $APP_NAME"
echo "   - Check Nginx status: sudo systemctl status nginx"
echo "   - View Nginx logs: sudo tail -f /var/log/nginx/error.log"
echo ""
echo "🔒 Security reminders:"
echo "   - Change default SSH port"
echo "   - Set up SSH key authentication"
echo "   - Regularly update system packages"
echo "   - Monitor application logs"
echo ""
print_status "Your Travel Log Application is now live at https://$DOMAIN_NAME"
