#!/bin/bash

# Local Preparation Script
# Run this on your local machine before uploading to DreamHost

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
title() { echo -e "\n${BLUE}=== $1 ===${NC}\n"; }

title "Local Preparation for DreamHost Deployment"

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    error "Not in project root directory. Please run this from the fojournapp directory."
    exit 1
fi

# Create production environment files
title "Creating Production Environment Files"

# Backend .env template
log "Creating backend/.env.production template..."
cat > backend/.env.production << 'EOF'
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://fojourn.site

# Database Configuration - UPDATE THESE VALUES
DB_HOST=mysql.fojourn.site
DB_PORT=3306
DB_NAME=victorydiv24_travel_log
DB_USER=victorydiv24_dbuser
DB_PASSWORD=YOUR_DB_PASSWORD_HERE

# JWT Configuration - UPDATE THIS
JWT_SECRET=YOUR_SUPER_SECRET_JWT_KEY_HERE

# Google Maps API Key
GOOGLE_MAPS_API_KEY=AIzaSyDQMVK2ARUNIgwPA6x81HRafZAMEdVSV7E

# File Upload Configuration
MAX_FILE_SIZE=50000000
UPLOAD_PATH=/home/victorydiv24/fojourn.site/fojournapp/backend/uploads
EOF

# Frontend .env for production
log "Creating frontend/.env.production..."
cat > frontend/.env.production << 'EOF'
REACT_APP_API_BASE_URL=https://fojourn.site/api
REACT_APP_PRODUCTION_API_URL=https://fojourn.site/api
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyDQMVK2ARUNIgwPA6x81HRafZAMEdVSV7E
REACT_APP_GOOGLE_MAPS_MAP_ID=DEMO_MAP_ID
EOF

# Update frontend .env for development/build
log "Updating frontend/.env for production build..."
cp frontend/.env.production frontend/.env

# Create .htaccess template
log "Creating .htaccess template..."
cat > .htaccess.template << 'EOF'
RewriteEngine On

# Handle API routes - proxy to PM2 process
RewriteRule ^api/(.*)$ http://localhost:3000/api/$1 [P,L]

# Handle React app routes
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [L]

# Security headers
<IfModule mod_headers.c>
Header always set X-Frame-Options DENY
Header always set X-Content-Type-Options nosniff
Header always set X-XSS-Protection "1; mode=block"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# Caching for static assets
<IfModule mod_expires.c>
ExpiresActive on
ExpiresByType text/css "access plus 1 year"
ExpiresByType application/javascript "access plus 1 year"
ExpiresByType image/png "access plus 1 year"
ExpiresByType image/jpeg "access plus 1 year"
ExpiresByType image/gif "access plus 1 year"
ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>

# Gzip compression
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

# Fix the infinite loop in package.json
title "Fixing Package.json Infinite Loop"
if grep -q '"postinstall"' package.json; then
    log "Commenting out postinstall script..."
    sed -i.backup 's/"postinstall"/#"postinstall"/g' package.json
    log "Backup created: package.json.backup"
fi

# Install dependencies locally to verify everything works
title "Installing Dependencies Locally"
log "Installing backend dependencies..."
cd backend && npm install && cd ..
log "Installing frontend dependencies..."
cd frontend && npm install && cd ..

# Build frontend locally to test
title "Building Frontend"
cd frontend
npm run build
cd ..
log "Frontend built successfully"

# Create deployment archive (optional)
title "Creating Deployment Package"
log "Creating deployment-ready archive..."

# Create a clean copy for deployment
mkdir -p deploy-package
rsync -av --exclude='node_modules' --exclude='.git' --exclude='deploy-package' --exclude='frontend/build' . deploy-package/

# Copy only production files
cp backend/.env.production deploy-package/backend/.env
cp frontend/.env.production deploy-package/frontend/.env
cp .htaccess.template deploy-package/.htaccess

log "Deployment package created in ./deploy-package/"

title "Preparation Complete!"

echo -e "${GREEN}✅ Production environment files created${NC}"
echo -e "${GREEN}✅ Dependencies installed and tested${NC}"
echo -e "${GREEN}✅ Frontend built successfully${NC}"
echo -e "${GREEN}✅ Deployment package ready${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "${YELLOW}1.${NC} Update database credentials in backend/.env.production"
echo -e "${YELLOW}2.${NC} Update JWT secret in backend/.env.production"
echo -e "${YELLOW}3.${NC} Upload deploy-package/* to your DreamHost ~/fojourn.site/fojournapp/"
echo -e "${YELLOW}4.${NC} SSH into DreamHost and run: chmod +x quick-deploy.sh && ./quick-deploy.sh"
echo ""
echo -e "${BLUE}Upload Commands (from deploy-package directory):${NC}"
echo -e "${YELLOW}Via SCP:${NC} scp -r . victorydiv24@fojourn.site:~/fojourn.site/fojournapp/"
echo -e "${YELLOW}Via rsync:${NC} rsync -av . victorydiv24@fojourn.site:~/fojourn.site/fojournapp/"
echo ""
echo -e "${GREEN}Files ready for deployment!${NC}"
