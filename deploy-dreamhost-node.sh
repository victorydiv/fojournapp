#!/bin/bash

# DreamHost Node.js (without npm) Deployment Script
# For cases where Node.js is available but npm is not

set -e  # Exit on any error

echo "🚀 DreamHost Node.js Deployment (Installing npm locally)..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is available
if ! command -v node >/dev/null 2>&1; then
    print_error "Node.js is not available. Please enable it in DreamHost panel first."
    exit 1
fi

print_status "Node.js available: $(node --version)"

# Check if npm is available
if ! command -v npm >/dev/null 2>&1; then
    print_warning "npm not available. Installing npm locally..."
    
    # Install npm locally
    cd ~
    
    # Download and install npm
    if curl -L https://npmjs.org/install.sh | sh; then
        print_status "npm installed successfully"
    else
        print_error "Failed to install npm. Trying alternative method..."
        
        # Alternative method: download npm manually
        wget https://registry.npmjs.org/npm/-/npm-latest.tgz
        tar -xzf npm-latest.tgz
        mkdir -p ~/node_modules
        mv package ~/node_modules/npm
        
        # Create npm wrapper script
        mkdir -p ~/bin
        cat > ~/bin/npm << 'EOF'
#!/bin/bash
node ~/node_modules/npm/bin/npm-cli.js "$@"
EOF
        chmod +x ~/bin/npm
        
        print_status "npm installed via alternative method"
    fi
    
    # Add to PATH
    export PATH=$HOME/bin:$HOME/node_modules/.bin:$PATH
    echo 'export PATH=$HOME/bin:$HOME/node_modules/.bin:$PATH' >> ~/.bashrc
    
    # Verify npm installation
    if command -v npm >/dev/null 2>&1; then
        print_status "✅ npm is now available: $(npm --version)"
    else
        print_error "❌ Failed to install npm. You'll need to build locally and upload."
        exit 1
    fi
else
    print_status "npm already available: $(npm --version)"
fi

# Get configuration
echo ""
echo "📋 Please provide deployment information:"
read -p "Domain name (e.g., yourdomain.com): " DOMAIN_NAME
read -p "Database hostname (usually mysql.$DOMAIN_NAME): " DB_HOST
read -p "Database name: " DB_NAME
read -p "Database username: " DB_USER
read -p "Database password: " DB_PASSWORD
read -p "JWT Secret (leave blank to generate): " JWT_SECRET
read -p "Google Maps API Key: " GOOGLE_MAPS_API_KEY

# Generate JWT secret if not provided
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
    print_status "Generated JWT secret"
fi

# Set up directory structure
APP_DIR="$HOME/$DOMAIN_NAME"
print_status "Setting up directories in $APP_DIR"

mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/fojournapp"

# Navigate to application directory
cd "$APP_DIR/fojournapp"

# Install dependencies
print_status "Installing application dependencies..."

# Install root dependencies
if [ -f "package.json" ]; then
    npm install
fi

# Install and build frontend
if [ -d "frontend" ]; then
    cd frontend
    print_status "Installing frontend dependencies..."
    npm install
    
    print_status "Building frontend..."
    npm run build
    
    # Copy built files to web root
    print_status "Copying frontend files to web root..."
    cp -r build/* "$APP_DIR/"
    
    cd ..
fi

# Install backend dependencies
if [ -d "backend" ]; then
    cd backend
    print_status "Installing backend dependencies..."
    npm install
    cd ..
fi

# Create environment file
print_status "Creating environment configuration..."
cat > backend/.env << EOF
# DreamHost Production Environment
NODE_ENV=production
PORT=3000

# Database Configuration
DB_HOST=$DB_HOST
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
UPLOAD_PATH=$APP_DIR/fojournapp/backend/uploads

# CORS Origins
CORS_ORIGINS=https://$DOMAIN_NAME,https://www.$DOMAIN_NAME
EOF

# Set up uploads directory
mkdir -p backend/uploads
chmod 755 backend/uploads

# Create .htaccess for frontend routing
print_status "Creating .htaccess for React routing..."
cat > "$APP_DIR/.htaccess" << 'EOF'
RewriteEngine On

# Handle React Router - serve index.html for non-file requests
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !^/api/
RewriteRule ^(.*)$ /index.html [L]

# Security headers
<IfModule mod_headers.c>
Header always set X-Frame-Options DENY
Header always set X-Content-Type-Options nosniff
Header always set X-XSS-Protection "1; mode=block"
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
ExpiresActive on
ExpiresByType text/css "access plus 1 year"
ExpiresByType application/javascript "access plus 1 year"
ExpiresByType image/png "access plus 1 year"
ExpiresByType image/jpeg "access plus 1 year"
</IfModule>

# Compress files
<IfModule mod_deflate.c>
AddOutputFilterByType DEFLATE text/plain text/html text/xml text/css application/xml application/xhtml+xml application/rss+xml application/javascript application/x-javascript
</IfModule>
EOF

# Import database schema
if [ -f "database/schema.sql" ]; then
    print_status "Importing database schema..."
    if mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < database/schema.sql; then
        print_status "✅ Database schema imported successfully"
    else
        print_error "❌ Failed to import database schema"
        print_info "You can import it manually later: mysql -h $DB_HOST -u $DB_USER -p $DB_NAME < database/schema.sql"
    fi
else
    print_warning "Database schema file not found"
fi

# Create startup script
print_status "Creating application startup script..."
cat > "$APP_DIR/start-backend.sh" << EOF
#!/bin/bash
# Application startup script

cd $APP_DIR/fojournapp/backend

# Set PATH to include npm
export PATH=$HOME/bin:$HOME/node_modules/.bin:\$PATH

# Check if already running
if pgrep -f "node.*server.js" > /dev/null; then
    echo "Backend is already running"
    exit 0
fi

# Start application
nohup node server.js > ../backend.log 2>&1 &
echo "Travel Log backend started"
echo "Check logs: tail -f $APP_DIR/fojournapp/backend.log"
EOF

chmod +x "$APP_DIR/start-backend.sh"

# Create stop script
cat > "$APP_DIR/stop-backend.sh" << EOF
#!/bin/bash
# Stop backend application

pkill -f "node.*server.js"
echo "Travel Log backend stopped"
EOF

chmod +x "$APP_DIR/stop-backend.sh"

# Create backup script
cat > "$APP_DIR/backup-db.sh" << EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$HOME/backups"
mkdir -p \$BACKUP_DIR

echo "Creating database backup..."
mysqldump -h $DB_HOST -u $DB_USER -p'$DB_PASSWORD' $DB_NAME > \$BACKUP_DIR/travel_log_\$DATE.sql

echo "Backup completed: \$DATE"
EOF

chmod +x "$APP_DIR/backup-db.sh"

print_status "🎉 Deployment completed!"

echo ""
echo "📝 Deployment Summary:"
echo "   - Frontend deployed to: $APP_DIR/"
echo "   - Backend files: $APP_DIR/fojournapp/backend/"
echo "   - Database: $DB_NAME on $DB_HOST"
echo "   - npm installed locally and available"
echo ""

echo "🔧 Next Steps:"
echo "1. Test frontend: https://$DOMAIN_NAME"
echo "2. Start backend: $APP_DIR/start-backend.sh"
echo "3. Check backend logs: tail -f $APP_DIR/fojournapp/backend.log"
echo "4. Create database backup: $APP_DIR/backup-db.sh"
echo ""

echo "🛠️  Management Commands:"
echo "   - Start backend: $APP_DIR/start-backend.sh"
echo "   - Stop backend: $APP_DIR/stop-backend.sh"
echo "   - Backup database: $APP_DIR/backup-db.sh"
echo "   - View backend logs: tail -f $APP_DIR/fojournapp/backend.log"
echo ""

echo "💡 Notes:"
echo "   - npm is now available for future use"
echo "   - Frontend is static and doesn't need backend to load"
echo "   - Backend provides API functionality"
echo "   - Consider external backend hosting for better performance"

# Create README
cat > "$APP_DIR/README-DEPLOYMENT.md" << EOF
# Travel Log Application - DreamHost Deployment

## Configuration
- **Domain**: https://$DOMAIN_NAME
- **Frontend**: Static files in $APP_DIR/
- **Backend**: Node.js app in $APP_DIR/fojournapp/backend/
- **Database**: $DB_NAME on $DB_HOST

## Management Commands
\`\`\`bash
# Start backend
$APP_DIR/start-backend.sh

# Stop backend
$APP_DIR/stop-backend.sh

# View logs
tail -f $APP_DIR/fojournapp/backend.log

# Backup database
$APP_DIR/backup-db.sh

# Update application
cd $APP_DIR/fojournapp && git pull
cd frontend && npm run build && cp -r build/* $APP_DIR/
$APP_DIR/stop-backend.sh && $APP_DIR/start-backend.sh
\`\`\`

## npm Usage
npm is now installed locally and available in your PATH.
You can use it normally: \`npm install\`, \`npm run build\`, etc.

Generated on: $(date)
EOF

print_status "Documentation saved to: $APP_DIR/README-DEPLOYMENT.md"
print_status "Your Travel Log Application frontend is now live at https://$DOMAIN_NAME"
