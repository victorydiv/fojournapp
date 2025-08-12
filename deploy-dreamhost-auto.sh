#!/bin/bash

# DreamHost Automated Deployment Script
# This script automates the entire deployment process for fojourn.site

set -e  # Exit on any error

# Configuration - Update these values for your setup
DOMAIN="fojourn.site"
DB_HOST="mysql.fojourn.site"
DB_NAME="victorydiv24_travel_log"
DB_USER="victorydiv24_dbuser"
DB_PASSWORD=""  # Will prompt for this
GOOGLE_MAPS_API_KEY="AIzaSyDQMVK2ARUNIgwPA6x81HRafZAMEdVSV7E"
JWT_SECRET=""  # Will generate this

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

title() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

# Check if running on DreamHost
check_environment() {
    title "Checking Environment"
    
    if [[ ! -d "$HOME/$DOMAIN" ]]; then
        error "Domain directory $HOME/$DOMAIN not found!"
        error "Make sure you're running this on your DreamHost server"
        exit 1
    fi
    
    log "Domain directory found: $HOME/$DOMAIN"
    log "Current user: $(whoami)"
    log "Home directory: $HOME"
}

# Prompt for sensitive information
get_user_input() {
    title "Configuration Setup"
    
    # Get database password
    if [[ -z "$DB_PASSWORD" ]]; then
        echo -n "Enter your MySQL database password: "
        read -s DB_PASSWORD
        echo
    fi
    
    # Generate JWT secret if not provided
    if [[ -z "$JWT_SECRET" ]]; then
        JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || date +%s | sha256sum | base64 | head -c 32)
        log "Generated JWT secret"
    fi
    
    log "Configuration collected successfully"
}

# Install npm locally if not available
setup_npm() {
    title "Setting up npm"
    
    if command -v npm &> /dev/null; then
        log "npm is already available: $(npm --version)"
        return 0
    fi
    
    warn "npm not found, installing locally..."
    
    cd ~
    
    # Download and install npm
    if command -v curl &> /dev/null; then
        curl -L https://npmjs.org/install.sh | sh
    elif command -v wget &> /dev/null; then
        wget -qO- https://npmjs.org/install.sh | sh
    else
        error "Neither curl nor wget available. Cannot install npm."
        exit 1
    fi
    
    # Add npm to PATH
    export PATH=$HOME/node_modules/.bin:$PATH
    echo 'export PATH=$HOME/node_modules/.bin:$PATH' >> ~/.bashrc
    
    if command -v npm &> /dev/null; then
        log "npm installed successfully: $(npm --version)"
    else
        error "npm installation failed"
        exit 1
    fi
}

# Install PM2 if not available
setup_pm2() {
    title "Setting up PM2"
    
    if command -v pm2 &> /dev/null; then
        log "PM2 is already available: $(pm2 --version)"
        return 0
    fi
    
    log "Installing PM2..."
    npm install pm2
    
    # Add PM2 to PATH if not already there
    export PATH=$HOME/node_modules/.bin:$PATH
    
    if command -v pm2 &> /dev/null; then
        log "PM2 installed successfully: $(pm2 --version)"
    else
        warn "PM2 not in PATH, will use npx pm2"
    fi
}

# Clone or update repository
setup_repository() {
    title "Setting up Repository"
    
    cd "$HOME/$DOMAIN"
    
    if [[ -d "fojournapp" ]]; then
        warn "fojournapp directory already exists, updating..."
        cd fojournapp
        git pull
        log "Repository updated"
    else
        log "Cloning repository..."
        git clone https://github.com/victorydiv/fojournapp.git
        cd fojournapp
        log "Repository cloned"
    fi
    
    log "Current directory: $(pwd)"
}

# Install dependencies (avoiding infinite loop)
install_dependencies() {
    title "Installing Dependencies"
    
    cd "$HOME/$DOMAIN/fojournapp"
    
    # Install backend dependencies
    log "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    
    # Install frontend dependencies
    log "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    
    log "Dependencies installed successfully"
}

# Configure environment files
configure_environment() {
    title "Configuring Environment"
    
    cd "$HOME/$DOMAIN/fojournapp"
    
    # Configure backend .env
    log "Creating backend .env file..."
    cat > backend/.env << EOF
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://$DOMAIN

# Database Configuration
DB_HOST=$DB_HOST
DB_PORT=3306
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

# Google Maps API Key
GOOGLE_MAPS_API_KEY=$GOOGLE_MAPS_API_KEY

# File Upload Configuration
MAX_FILE_SIZE=50000000
UPLOAD_PATH=$HOME/$DOMAIN/fojournapp/backend/uploads
EOF
    
    # Configure frontend .env
    log "Creating frontend .env file..."
    cat > frontend/.env << EOF
REACT_APP_API_BASE_URL=https://$DOMAIN/api
REACT_APP_PRODUCTION_API_URL=https://$DOMAIN/api
REACT_APP_GOOGLE_MAPS_API_KEY=$GOOGLE_MAPS_API_KEY
REACT_APP_GOOGLE_MAPS_MAP_ID=DEMO_MAP_ID
EOF
    
    log "Environment files configured"
}

# Build frontend
build_frontend() {
    title "Building Frontend"
    
    cd "$HOME/$DOMAIN/fojournapp/frontend"
    
    log "Building React application..."
    npm run build
    
    log "Copying build files to web root..."
    cp -r build/* "$HOME/$DOMAIN/"
    
    log "Frontend built and deployed"
}

# Set up directories and permissions
setup_directories() {
    title "Setting up Directories"
    
    # Create necessary directories
    mkdir -p "$HOME/$DOMAIN/fojournapp/logs"
    mkdir -p "$HOME/$DOMAIN/fojournapp/backend/uploads"
    
    # Set permissions
    chmod 755 "$HOME/$DOMAIN/fojournapp/backend/uploads"
    
    log "Directories created and permissions set"
}

# Configure .htaccess
configure_htaccess() {
    title "Configuring .htaccess"
    
    cat > "$HOME/$DOMAIN/.htaccess" << 'EOF'
RewriteEngine On

# Handle API routes - proxy to PM2 process
RewriteRule ^api/(.*)$ http://localhost:3000/api/$1 [P,L]

# Handle React app routes
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [L]

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
    
    log ".htaccess configured"
}

# Import database schema
setup_database() {
    title "Setting up Database"
    
    cd "$HOME/$DOMAIN/fojournapp"
    
    log "Testing database connection..."
    if mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT 1;" &> /dev/null; then
        log "Database connection successful"
    else
        error "Database connection failed. Please check your credentials."
        return 1
    fi
    
    log "Importing database schema..."
    if [[ -f "database/schema.sql" ]]; then
        mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < database/schema.sql
        log "Database schema imported successfully"
    else
        warn "database/schema.sql not found, skipping schema import"
    fi
    
    log "Verifying database tables..."
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW TABLES;"
}

# Start application with PM2
start_application() {
    title "Starting Application with PM2"
    
    cd "$HOME/$DOMAIN/fojournapp"
    
    # Stop any existing PM2 processes
    if command -v pm2 &> /dev/null; then
        pm2 delete fojourn-travel-log 2>/dev/null || true
        PM2_CMD="pm2"
    else
        npx pm2 delete fojourn-travel-log 2>/dev/null || true
        PM2_CMD="npx pm2"
    fi
    
    log "Starting application with PM2..."
    
    # Start with ecosystem config if available
    if [[ -f "ecosystem.config.js" ]]; then
        $PM2_CMD start ecosystem.config.js --env production
    else
        # Manual start
        $PM2_CMD start backend/server.js \
            --name "fojourn-travel-log" \
            --cwd ./backend \
            --env NODE_ENV=production \
            --env PORT=3000 \
            --log ./logs/combined.log \
            --error ./logs/err.log \
            --out ./logs/out.log
    fi
    
    # Save PM2 configuration
    $PM2_CMD save
    
    log "Application started successfully!"
    
    # Show status
    $PM2_CMD status
    $PM2_CMD logs fojourn-travel-log --lines 10
}

# Create management scripts
create_management_scripts() {
    title "Creating Management Scripts"
    
    # Create restart script
    cat > "$HOME/$DOMAIN/restart-app.sh" << 'EOF'
#!/bin/bash
cd ~/fojourn.site/fojournapp
if command -v pm2 &> /dev/null; then
    pm2 restart fojourn-travel-log
else
    npx pm2 restart fojourn-travel-log
fi
echo "Application restarted"
EOF
    chmod +x "$HOME/$DOMAIN/restart-app.sh"
    
    # Create logs script
    cat > "$HOME/$DOMAIN/view-logs.sh" << 'EOF'
#!/bin/bash
cd ~/fojourn.site/fojournapp
if command -v pm2 &> /dev/null; then
    pm2 logs fojourn-travel-log
else
    npx pm2 logs fojourn-travel-log
fi
EOF
    chmod +x "$HOME/$DOMAIN/view-logs.sh"
    
    # Create status script
    cat > "$HOME/$DOMAIN/app-status.sh" << 'EOF'
#!/bin/bash
cd ~/fojourn.site/fojournapp
if command -v pm2 &> /dev/null; then
    pm2 status
else
    npx pm2 status
fi
EOF
    chmod +x "$HOME/$DOMAIN/app-status.sh"
    
    # Create update script
    cat > "$HOME/$DOMAIN/update-app.sh" << 'EOF'
#!/bin/bash
cd ~/fojourn.site/fojournapp

echo "Pulling latest changes..."
git pull

echo "Installing dependencies..."
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

echo "Building frontend..."
cd frontend && npm run build && cd ..

echo "Copying to web root..."
cp -r frontend/build/* ~/fojourn.site/

echo "Restarting application..."
if command -v pm2 &> /dev/null; then
    pm2 restart fojourn-travel-log
else
    npx pm2 restart fojourn-travel-log
fi

echo "Update complete!"
EOF
    chmod +x "$HOME/$DOMAIN/update-app.sh"
    
    log "Management scripts created:"
    log "  - restart-app.sh: Restart the application"
    log "  - view-logs.sh: View application logs"
    log "  - app-status.sh: Check application status"
    log "  - update-app.sh: Update and redeploy application"
}

# Main deployment function
main() {
    title "DreamHost Automated Deployment for $DOMAIN"
    
    check_environment
    get_user_input
    setup_npm
    setup_pm2
    setup_repository
    install_dependencies
    configure_environment
    build_frontend
    setup_directories
    configure_htaccess
    setup_database
    start_application
    create_management_scripts
    
    title "Deployment Complete!"
    
    echo -e "${GREEN}✅ Your Travel Log application is now deployed!${NC}"
    echo -e "${GREEN}✅ Frontend: https://$DOMAIN${NC}"
    echo -e "${GREEN}✅ API: https://$DOMAIN/api${NC}"
    echo ""
    echo -e "${BLUE}Management Commands:${NC}"
    echo -e "  ${YELLOW}View Status:${NC} ~/app-status.sh"
    echo -e "  ${YELLOW}View Logs:${NC} ~/view-logs.sh"
    echo -e "  ${YELLOW}Restart App:${NC} ~/restart-app.sh"
    echo -e "  ${YELLOW}Update App:${NC} ~/update-app.sh"
    echo ""
    echo -e "${BLUE}Manual PM2 Commands:${NC}"
    if command -v pm2 &> /dev/null; then
        echo -e "  ${YELLOW}pm2 status${NC}"
        echo -e "  ${YELLOW}pm2 logs fojourn-travel-log${NC}"
        echo -e "  ${YELLOW}pm2 restart fojourn-travel-log${NC}"
    else
        echo -e "  ${YELLOW}npx pm2 status${NC}"
        echo -e "  ${YELLOW}npx pm2 logs fojourn-travel-log${NC}"
        echo -e "  ${YELLOW}npx pm2 restart fojourn-travel-log${NC}"
    fi
}

# Run main function
main "$@"
