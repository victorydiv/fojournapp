#!/bin/bash

# DreamHost Shared Hosting Deployment Script for Travel Log Application
# This script is designed for DreamHost shared hosting limitations

set -e  # Exit on any error

echo "🚀 Starting Travel Log Application Deployment on DreamHost Shared Hosting..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
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

echo "📋 DreamHost Shared Hosting Configuration"
echo "============================================"

# Get configuration from user
prompt_input "Your DreamHost username (e.g., victorydiv24)" USERNAME "victorydiv24"
prompt_input "Your domain name (e.g., yourdomain.com)" DOMAIN_NAME
prompt_input "Database hostname (usually mysql.yourdomain.com)" DB_HOST "mysql.$DOMAIN_NAME"
prompt_input "Database name (usually ${USERNAME}_travel_log)" DB_NAME "${USERNAME}_travel_log"
prompt_input "Database username (usually ${USERNAME}_dbuser)" DB_USER "${USERNAME}_dbuser"
prompt_input "Database password" DB_PASSWORD
prompt_input "JWT Secret (leave blank to generate)" JWT_SECRET
prompt_input "Google Maps API Key" GOOGLE_MAPS_API_KEY
prompt_input "External backend URL (Railway/Render/Heroku)" BACKEND_URL

# Generate JWT secret if not provided
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || date | md5sum | cut -d' ' -f1)
    print_status "Generated JWT secret"
fi

print_status "Configuration collected. Starting deployment..."

# Check current directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the fojournapp root directory"
    exit 1
fi

# Check available tools
print_status "Checking available tools..."

if command_exists node; then
    print_status "Node.js available: $(node --version)"
    NODE_AVAILABLE=true
else
    print_warning "Node.js not available - backend must be deployed externally"
    NODE_AVAILABLE=false
fi

if command_exists git; then
    print_status "Git available: $(git --version)"
else
    print_warning "Git not available - using current files"
fi

# Set up directory structure
print_status "Setting up directory structure..."
APP_DIR="$HOME/$DOMAIN_NAME"
BACKUP_DIR="$HOME/backups"

mkdir -p "$APP_DIR"
mkdir -p "$BACKUP_DIR"
mkdir -p "$APP_DIR/fojournapp"

# Copy application files
print_status "Copying application files..."
cp -r . "$APP_DIR/fojournapp/"

# Install dependencies if Node.js is available
if [ "$NODE_AVAILABLE" = true ]; then
    print_status "Installing dependencies..."
    cd "$APP_DIR/fojournapp"
    
    # Install root dependencies
    npm install
    
    # Install frontend dependencies
    cd frontend
    npm install
    
    # Install backend dependencies
    cd ../backend
    npm install
    
    cd ..
else
    print_warning "Skipping dependency installation - Node.js not available"
fi

# Build frontend
print_status "Building frontend..."
cd "$APP_DIR/fojournapp"

if [ "$NODE_AVAILABLE" = true ]; then
    cd frontend
    npm run build
    cd ..
    
    # Copy built files to web root
    print_status "Copying frontend files to web root..."
    cp -r frontend/build/* "$APP_DIR/"
else
    print_warning "Cannot build frontend - Node.js not available"
    print_info "Please build frontend locally and upload the build files"
fi

# Create environment file for backend
print_status "Creating backend environment file..."
cat > "$APP_DIR/fojournapp/backend/.env" << EOF
# DreamHost Shared Hosting Environment Configuration
NODE_ENV=production
PORT=3000

# DreamHost Database Configuration
DB_HOST=$DB_HOST
DB_PORT=3306
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

# JWT Secret
JWT_SECRET=$JWT_SECRET

# Google Maps API Key
GOOGLE_MAPS_API_KEY=$GOOGLE_MAPS_API_KEY

# File Upload Settings - DreamHost paths
MAX_FILE_SIZE=50000000
UPLOAD_PATH=$APP_DIR/fojournapp/backend/uploads

# CORS Origins
CORS_ORIGINS=https://$DOMAIN_NAME,https://www.$DOMAIN_NAME
EOF

# Create uploads directory
print_status "Setting up uploads directory..."
mkdir -p "$APP_DIR/fojournapp/backend/uploads"
chmod 755 "$APP_DIR/fojournapp/backend/uploads"

# Create frontend configuration for external backend
if [ -n "$BACKEND_URL" ]; then
    print_status "Configuring frontend for external backend..."
    cat > "$APP_DIR/config.js" << EOF
// Frontend configuration for external backend
window.APP_CONFIG = {
    API_BASE_URL: '$BACKEND_URL'
};
EOF

    # Update index.html to include config
    if [ -f "$APP_DIR/index.html" ]; then
        sed -i '/<head>/a\  <script src="/config.js"></script>' "$APP_DIR/index.html"
    fi
fi

# Create .htaccess for frontend routing
print_status "Creating .htaccess for frontend routing..."
cat > "$APP_DIR/.htaccess" << EOF
# DreamHost Travel Log Application Configuration

RewriteEngine On

# Handle React Router - serve index.html for non-file requests
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !^/api/
RewriteRule ^(.*)$ /index.html [L]

# Cache static assets
<IfModule mod_expires.c>
ExpiresActive on
ExpiresByType text/css "access plus 1 year"
ExpiresByType application/javascript "access plus 1 year"
ExpiresByType image/png "access plus 1 year"
ExpiresByType image/jpeg "access plus 1 year"
ExpiresByType image/gif "access plus 1 year"
ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>

# Security headers
<IfModule mod_headers.c>
Header always set X-Frame-Options DENY
Header always set X-Content-Type-Options nosniff
Header always set X-XSS-Protection "1; mode=block"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# Compress files
<IfModule mod_deflate.c>
AddOutputFilterByType DEFLATE text/plain
AddOutputFilterByType DEFLATE text/html
AddOutputFilterByType DEFLATE text/xml
AddOutputFilterByType DEFLATE text/css
AddOutputFilterByType DEFLATE application/xml
AddOutputFilterByType DEFLATE application/xhtml+xml
AddOutputFilterByType DEFLATE application/rss+xml
AddOutputFilterByType DEFLATE application/javascript
AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>
EOF

# Create database import script
print_status "Creating database setup script..."
cat > "$APP_DIR/setup-database.sh" << EOF
#!/bin/bash
# Database setup script for DreamHost

echo "Importing database schema..."
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME < fojournapp/database/schema.sql

echo "Verifying database setup..."
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SHOW TABLES;"

echo "Database setup complete!"
EOF

chmod +x "$APP_DIR/setup-database.sh"

# Create backup script
print_status "Creating backup script..."
cat > "$APP_DIR/backup-db.sh" << EOF
#!/bin/bash
# Database backup script for DreamHost

DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_DIR"
mkdir -p \$BACKUP_DIR

echo "Creating database backup..."
mysqldump -h $DB_HOST -u $DB_USER -p'$DB_PASSWORD' $DB_NAME > \$BACKUP_DIR/travel_log_\$DATE.sql

# Keep only last 7 days of backups
find \$BACKUP_DIR -name "travel_log_*" -mtime +7 -delete

echo "Backup completed: \$DATE"
echo "Backup saved to: \$BACKUP_DIR/travel_log_\$DATE.sql"
EOF

chmod +x "$APP_DIR/backup-db.sh"

# Create startup script (if Node.js available)
if [ "$NODE_AVAILABLE" = true ]; then
    print_status "Creating application startup script..."
    cat > "$APP_DIR/start-app.sh" << EOF
#!/bin/bash
# Application startup script for DreamHost

cd $APP_DIR/fojournapp/backend

# Check if already running
if pgrep -f "node.*server.js" > /dev/null; then
    echo "Application is already running"
    exit 0
fi

# Start application
nohup node server.js > ../app.log 2>&1 &

echo "Travel Log application started"
echo "Check logs: tail -f $APP_DIR/fojournapp/app.log"
EOF

    chmod +x "$APP_DIR/start-app.sh"
fi

# Test database connection
print_status "Testing database connection..."
if command_exists mysql; then
    if mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT 1;" > /dev/null 2>&1; then
        print_status "✅ Database connection successful"
        
        # Import schema
        print_status "Importing database schema..."
        mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < database/schema.sql
        print_status "✅ Database schema imported"
    else
        print_error "❌ Database connection failed"
        print_info "Please check your database credentials and try running: $APP_DIR/setup-database.sh"
    fi
else
    print_warning "MySQL client not available - please run setup-database.sh manually"
fi

# Final status
print_status "🎉 DreamHost deployment completed!"

echo ""
echo "📝 Deployment Summary:"
echo "   - Frontend deployed to: $APP_DIR/"
echo "   - Application files: $APP_DIR/fojournapp/"
echo "   - Database: $DB_NAME on $DB_HOST"
if [ "$NODE_AVAILABLE" = true ]; then
    echo "   - Backend: Can run locally (limited functionality)"
else
    echo "   - Backend: Deploy to external service (recommended)"
fi
echo "   - Backups directory: $BACKUP_DIR"
echo ""

echo "🔧 Next Steps:"

if [ "$NODE_AVAILABLE" = false ] || [ -n "$BACKEND_URL" ]; then
    echo "1. 🌐 Deploy backend to external service:"
    echo "   - Railway: https://railway.app"
    echo "   - Render: https://render.com"
    echo "   - Heroku: https://heroku.com"
    echo ""
    echo "2. 📋 Update frontend configuration:"
    echo "   - Edit $APP_DIR/config.js with your backend URL"
    echo ""
fi

echo "3. 🗄️  Set up database (if not done automatically):"
echo "   - Run: $APP_DIR/setup-database.sh"
echo ""

echo "4. 🔐 Configure SSL in DreamHost panel"
echo ""

echo "5. 🧪 Test your application:"
echo "   - Visit: https://$DOMAIN_NAME"
echo ""

echo "📚 Useful commands:"
echo "   - Database backup: $APP_DIR/backup-db.sh"
if [ "$NODE_AVAILABLE" = true ]; then
    echo "   - Start backend: $APP_DIR/start-app.sh"
fi
echo "   - Check logs: tail -f $APP_DIR/fojournapp/app.log"
echo "   - Update app: cd $APP_DIR/fojournapp && git pull"
echo ""

if [ -z "$BACKEND_URL" ]; then
    echo "💡 Recommendation:"
    echo "   For best performance, deploy the backend to an external service"
    echo "   and use DreamHost only for the frontend and database."
    echo ""
fi

print_status "Your Travel Log Application frontend is now live at https://$DOMAIN_NAME"

# Create README for the deployment
cat > "$APP_DIR/README-DEPLOYMENT.md" << EOF
# Travel Log Application - DreamHost Deployment

## Deployment Information
- **Domain**: https://$DOMAIN_NAME
- **Frontend**: Deployed to DreamHost shared hosting
- **Database**: $DB_NAME on $DB_HOST
- **Backend**: $([ -n "$BACKEND_URL" ] && echo "External service: $BACKEND_URL" || echo "Local (limited functionality)")

## File Structure
- **Web Root**: $APP_DIR/
- **Application**: $APP_DIR/fojournapp/
- **Uploads**: $APP_DIR/fojournapp/backend/uploads/
- **Backups**: $BACKUP_DIR/

## Maintenance Commands
\`\`\`bash
# Database backup
$APP_DIR/backup-db.sh

# Database setup (if needed)
$APP_DIR/setup-database.sh

$([ "$NODE_AVAILABLE" = true ] && echo "# Start backend application
$APP_DIR/start-app.sh")

# View application logs
tail -f $APP_DIR/fojournapp/app.log

# Update application
cd $APP_DIR/fojournapp && git pull
\`\`\`

## Configuration Files
- **Environment**: $APP_DIR/fojournapp/backend/.env
- **Frontend Config**: $APP_DIR/config.js
- **Web Server**: $APP_DIR/.htaccess

## Troubleshooting
1. Check application logs: \`tail -f $APP_DIR/fojournapp/app.log\`
2. Test database: \`mysql -h $DB_HOST -u $DB_USER -p $DB_NAME\`
3. Verify file permissions: \`ls -la $APP_DIR/\`
4. Check disk quota: \`quota -u\`

## External Backend Setup
If using external backend service:
1. Deploy backend code to Railway/Render/Heroku
2. Update $APP_DIR/config.js with your backend URL
3. Configure CORS in your backend for $DOMAIN_NAME

Generated on: $(date)
EOF

echo "📖 Deployment documentation saved to: $APP_DIR/README-DEPLOYMENT.md"
