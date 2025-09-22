#!/bin/bash

# Quick Node.js Setup for Shared Hosting (No Sudo Required)
# Specifically designed for DreamHost and similar shared hosting providers

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}    Node.js Setup for Shared Hosting${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""

# Check current Node.js version
echo -e "${YELLOW}Current Node.js Version:${NC}"
if command -v node >/dev/null 2>&1; then
    node --version
else
    echo -e "${RED}Node.js not found${NC}"
fi
echo ""

# Check if NVM is installed
echo -e "${YELLOW}Checking for NVM...${NC}"
if command -v nvm >/dev/null 2>&1; then
    echo -e "${GREEN}✓ NVM is installed${NC}"
    nvm --version
else
    echo -e "${RED}✗ NVM is not installed${NC}"
    echo -e "${YELLOW}Installing NVM...${NC}"
    
    # Install NVM
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    
    # Reload shell
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    
    if command -v nvm >/dev/null 2>&1; then
        echo -e "${GREEN}✓ NVM installed successfully${NC}"
    else
        echo -e "${RED}✗ NVM installation failed. Please run: source ~/.bashrc${NC}"
        exit 1
    fi
fi
echo ""

# Install Node.js 18 LTS
echo -e "${YELLOW}Installing Node.js 18 LTS...${NC}"
nvm install 18
nvm use 18
nvm alias default 18

echo ""
echo -e "${GREEN}✓ Node.js 18 LTS installed${NC}"
echo -e "${YELLOW}Current versions:${NC}"
node --version
npm --version
echo ""

# Update your application
echo -e "${YELLOW}Updating your application...${NC}"

# Navigate to app directory (adjust path as needed)
APP_DIR="~/fojourn.site/fojournapp/backend"
if [ -d "$APP_DIR" ]; then
    cd "$APP_DIR"
    
    # Remove old dependencies
    echo -e "${CYAN}Removing old dependencies...${NC}"
    rm -rf node_modules package-lock.json
    
    # Install dependencies with new Node.js version
    echo -e "${CYAN}Installing dependencies...${NC}"
    npm install
    
    echo -e "${GREEN}✓ Dependencies updated${NC}"
else
    echo -e "${RED}Application directory not found: $APP_DIR${NC}"
    echo -e "${YELLOW}Please update the APP_DIR variable in this script${NC}"
fi
echo ""

# PM2 management
echo -e "${YELLOW}PM2 Management:${NC}"
if command -v pm2 >/dev/null 2>&1; then
    echo -e "${CYAN}Restarting PM2 application...${NC}"
    
    # Stop current application
    pm2 stop fojourn-travel-log 2>/dev/null || echo "Application not running"
    
    # Delete old process
    pm2 delete fojourn-travel-log 2>/dev/null || echo "No existing process to delete"
    
    # Start with new Node.js version
    pm2 start server.js --name fojourn-travel-log
    
    # Save configuration
    pm2 save
    
    echo -e "${GREEN}✓ Application restarted with Node.js $(node --version)${NC}"
    
    # Show status
    pm2 status
else
    echo -e "${RED}PM2 not found. Please install PM2:${NC}"
    echo "npm install -g pm2"
fi
echo ""

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}    Setup Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test your application: pm2 logs fojourn-travel-log"
echo "2. Check for errors in the logs"
echo "3. Verify your app is working at your domain"
echo ""
echo -e "${YELLOW}To use these versions permanently, add to ~/.bashrc:${NC}"
echo 'export NVM_DIR="$HOME/.nvm"'
echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"'
echo '[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"'
echo 'nvm use 18'
echo ""
echo -e "${CYAN}Your Node.js environment is now ready!${NC}"