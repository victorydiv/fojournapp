#!/bin/bash

# FoJourn Production Server Management Script
# Usage: ./manage-server.sh

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="fojourn"
APP_DIR="~/fojourn.site/fojournapp"
PM2_APP_NAME="fojourn-travel-log"
LOG_DIR="~/fojourn.site/fojournapp/logs"
BACKUP_DIR="~/fojourn.site/fojournapp/backups"
SERVICE_NAME="apache2"

# Load environment variables from backend .env file
load_env_variables() {
    ENV_FILE="$APP_DIR/backend/.env"
    if [ -f "$ENV_FILE" ]; then
        echo -e "${GREEN}Loading environment variables from $ENV_FILE${NC}"
        # Export variables from .env file, ignoring comments and empty lines
        export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)
        echo -e "${GREEN}✓ Environment variables loaded${NC}"
    else
        echo -e "${RED}✗ Environment file not found: $ENV_FILE${NC}"
        echo -e "${YELLOW}Please ensure the .env file exists in the backend folder${NC}"
    fi
    echo ""
}

# Load environment variables at startup
load_env_variables

# Function to display header
show_header() {
    clear
    echo -e "${CYAN}================================================${NC}"
    echo -e "${CYAN}    FoJourn Production Server Management${NC}"
    echo -e "${CYAN}================================================${NC}"
    echo -e "${GREEN}Server: $(hostname)${NC}"
    echo -e "${GREEN}Date: $(date)${NC}"
    echo -e "${GREEN}User: $(whoami)${NC}"
    echo ""
}

# Function to display menu
show_menu() {
    echo -e "${YELLOW}Select an option:${NC}"
    echo "1)  Application Status & Health Check"
    echo "2)  Deploy Latest from Git"
    echo "3)  Restart Application"
    echo "4)  Restart All Services"
    echo "5)  View Application Logs"
    echo "6)  View Error Logs"
    echo "7)  View System Logs"
    echo "8)  System Resource Usage"
    echo "9)  Database Management"
    echo "10) Backup Management"
    echo "11) Process Management"
    echo "12) SSL Certificate Status"
    echo "13) Disk Space Usage"
    echo "14) Network Status"
    echo "15) Environment Variables"
    echo "16) Node.js Management"
    echo "17) Update System Packages"
    echo "18) Clean Logs & Temp Files"
    echo "19) Security Audit"
    echo "0)  Exit"
    echo ""
}

# Function to pause and wait for user input
pause() {
    echo ""
    echo -e "${CYAN}Press Enter to continue...${NC}"
    read -r
}

# Application Status & Health Check
app_status() {
    echo -e "${BLUE}=== Application Status & Health Check ===${NC}"
    
    # PM2 Status
    echo -e "${YELLOW}PM2 Application Status:${NC}"
    pm2 status
    echo ""
    
    # Check if app is responding
    echo -e "${YELLOW}Health Check:${NC}"
    if curl -f -s http://localhost:3001/api/health > /dev/null; then
        echo -e "${GREEN}✓ Application is responding${NC}"
    else
        echo -e "${RED}✗ Application is not responding${NC}"
    fi
    
    # Check database connection
    echo -e "${YELLOW}Database Connection:${NC}"
    if mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Database connection successful${NC}"
    else
        echo -e "${RED}✗ Database connection failed${NC}"
        echo -e "${YELLOW}Using: Host=$DB_HOST, Port=$DB_PORT, User=$DB_USER, Database=$DB_NAME${NC}"
    fi
    
    # Check apache status
    echo -e "${YELLOW}Apache Status:${NC}"
    systemctl is-active apache2 > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Apache is running${NC}"
    else
        echo -e "${RED}✗ Apache is not running${NC}"
    fi
    
    # Check uptime
    echo -e "${YELLOW}System Uptime:${NC}"
    uptime
    
    pause
}

# Deploy Latest from Git
deploy_latest() {
    echo -e "${BLUE}=== Deploying Latest from Git ===${NC}"
    
    cd "$APP_DIR" || exit 1
    
    echo -e "${YELLOW}Current branch and commit:${NC}"
    git branch --show-current
    git log --oneline -1
    echo ""
    
    echo -e "${YELLOW}Pulling latest changes...${NC}"
    git fetch origin
    git pull origin master
    
    echo -e "${YELLOW}Installing/updating dependencies...${NC}"
    npm install --production
    
    echo -e "${YELLOW}Building application...${NC}"
    npm run build
    
    echo -e "${YELLOW}Restarting application...${NC}"
    pm2 restart "$PM2_APP_NAME"
    
    echo -e "${GREEN}Deployment complete!${NC}"
    pause
}

# Restart Application
restart_app() {
    echo -e "${BLUE}=== Restarting Application ===${NC}"
    
    echo -e "${YELLOW}Restarting PM2 application...${NC}"
    pm2 restart "$PM2_APP_NAME"
    
    echo -e "${YELLOW}Waiting for application to start...${NC}"
    sleep 5
    
    # Health check
    if curl -f -s http://localhost:3001/api/health > /dev/null; then
        echo -e "${GREEN}✓ Application restarted successfully${NC}"
    else
        echo -e "${RED}✗ Application may not have started properly${NC}"
    fi
    
    pause
}

# Restart All Services
restart_services() {
    echo -e "${BLUE}=== Restarting All Services ===${NC}"
    
    echo -e "${YELLOW}Restarting Apache...${NC}"
    systemctl restart apache2
    
    echo -e "${YELLOW}Restarting MySQL...${NC}"
    systemctl restart mysql
    
    echo -e "${YELLOW}Restarting PM2...${NC}"
    pm2 restart all
    
    echo -e "${GREEN}All services restarted!${NC}"
    pause
}

# View Application Logs
view_app_logs() {
    echo -e "${BLUE}=== Application Logs ===${NC}"
    echo "Choose log type:"
    echo "1) PM2 Logs (live)"
    echo "2) PM2 Error Logs"
    echo "3) PM2 Out Logs"
    echo "4) Application Log Files"
    read -p "Enter choice: " log_choice
    
    case $log_choice in
        1)
            echo -e "${YELLOW}Showing live PM2 logs (Ctrl+C to exit):${NC}"
            pm2 logs "$PM2_APP_NAME" --lines 100
            ;;
        2)
            echo -e "${YELLOW}PM2 Error Logs:${NC}"
            pm2 logs "$PM2_APP_NAME" --err --lines 50
            ;;
        3)
            echo -e "${YELLOW}PM2 Out Logs:${NC}"
            pm2 logs "$PM2_APP_NAME" --out --lines 50
            ;;
        4)
            echo -e "${YELLOW}Application Log Files:${NC}"
            if [ -d "$LOG_DIR" ]; then
                ls -la "$LOG_DIR"
                echo ""
                read -p "Enter log file name to view (or press Enter to skip): " logfile
                if [ -n "$logfile" ] && [ -f "$LOG_DIR/$logfile" ]; then
                    tail -50 "$LOG_DIR/$logfile"
                fi
            else
                echo "Log directory not found: $LOG_DIR"
            fi
            ;;
    esac
    
    pause
}

# View Error Logs
view_error_logs() {
    echo -e "${BLUE}=== Error Logs ===${NC}"
    
    echo -e "${YELLOW}Apache Error Logs:${NC}"
    tail -20 /var/log/apache2/error.log
    echo ""
    
    echo -e "${YELLOW}System Error Logs:${NC}"
    tail -20 /var/log/syslog | grep -i error
    echo ""
    
    echo -e "${YELLOW}MySQL Error Logs:${NC}"
    tail -20 /var/log/mysql/error.log
    
    pause
}

# View System Logs
view_system_logs() {
    echo -e "${BLUE}=== System Logs ===${NC}"
    
    echo "Choose log type:"
    echo "1) System Log (syslog)"
    echo "2) Authentication Log"
    echo "3) Kernel Log"
    echo "4) Boot Log"
    read -p "Enter choice: " log_choice
    
    case $log_choice in
        1)
            echo -e "${YELLOW}System Log (last 30 entries):${NC}"
            tail -30 /var/log/syslog
            ;;
        2)
            echo -e "${YELLOW}Authentication Log:${NC}"
            tail -20 /var/log/auth.log
            ;;
        3)
            echo -e "${YELLOW}Kernel Log:${NC}"
            dmesg | tail -20
            ;;
        4)
            echo -e "${YELLOW}Boot Log:${NC}"
            tail -20 /var/log/boot.log
            ;;
    esac
    
    pause
}

# System Resource Usage
system_resources() {
    echo -e "${BLUE}=== System Resource Usage ===${NC}"
    
    echo -e "${YELLOW}CPU Usage:${NC}"
    top -bn1 | grep "Cpu(s)"
    echo ""
    
    echo -e "${YELLOW}Memory Usage:${NC}"
    free -h
    echo ""
    
    echo -e "${YELLOW}Top Processes by CPU:${NC}"
    ps aux --sort=-%cpu | head -10
    echo ""
    
    echo -e "${YELLOW}Top Processes by Memory:${NC}"
    ps aux --sort=-%mem | head -10
    echo ""
    
    echo -e "${YELLOW}Load Average:${NC}"
    uptime
    
    pause
}

# Database Management
database_management() {
    echo -e "${BLUE}=== Database Management ===${NC}"
    
    echo "Choose database operation:"
    echo "1) Database Status"
    echo "2) Database Size"
    echo "3) Running Queries"
    echo "4) Create Backup"
    echo "5) List Recent Backups"
    echo "6) MySQL Command Line"
    read -p "Enter choice: " db_choice
    
    case $db_choice in
        1)
            echo -e "${YELLOW}Database Status:${NC}"
            systemctl status mysql --no-pager
            ;;
        2)
            echo -e "${YELLOW}Database Size:${NC}"
            mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT table_schema 'Database', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) 'Size in MB' FROM information_schema.tables GROUP BY table_schema;"
            ;;
        3)
            echo -e "${YELLOW}Running Queries:${NC}"
            mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "SHOW PROCESSLIST;"
            ;;
        4)
            echo -e "${YELLOW}Creating Database Backup...${NC}"
            mkdir -p "$BACKUP_DIR"
            backup_file="$BACKUP_DIR/${DB_NAME}_$(date +%Y%m%d_%H%M%S).sql"
            mysqldump -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" > "$backup_file"
            echo -e "${GREEN}Backup created: $backup_file${NC}"
            ;;
        5)
            echo -e "${YELLOW}Recent Backups:${NC}"
            ls -lah "$BACKUP_DIR" | head -10
            ;;
        6)
            echo -e "${YELLOW}Opening MySQL Command Line...${NC}"
            mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME"
            ;;
    esac
    
    pause
}

# Backup Management
backup_management() {
    echo -e "${BLUE}=== Backup Management ===${NC}"
    
    echo "Choose backup operation:"
    echo "1) Create Full Backup"
    echo "2) List Backups"
    echo "3) Clean Old Backups"
    echo "4) Restore from Backup"
    read -p "Enter choice: " backup_choice
    
    case $backup_choice in
        1)
            echo -e "${YELLOW}Creating Full Backup...${NC}"
            mkdir -p "$BACKUP_DIR"
            backup_name="full_backup_$(date +%Y%m%d_%H%M%S)"
            
            # Database backup
            mysqldump -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" > "$BACKUP_DIR/${backup_name}_db.sql"
            
            # Application files backup
            tar -czf "$BACKUP_DIR/${backup_name}_files.tar.gz" -C "$APP_DIR" .
            
            echo -e "${GREEN}Full backup created in $BACKUP_DIR${NC}"
            ;;
        2)
            echo -e "${YELLOW}Available Backups:${NC}"
            ls -lah "$BACKUP_DIR"
            ;;
        3)
            echo -e "${YELLOW}Cleaning backups older than 30 days...${NC}"
            find "$BACKUP_DIR" -type f -mtime +30 -delete
            echo -e "${GREEN}Old backups cleaned${NC}"
            ;;
        4)
            echo -e "${YELLOW}Available Database Backups:${NC}"
            ls -1 "$BACKUP_DIR"/*.sql 2>/dev/null
            read -p "Enter backup filename to restore: " restore_file
            if [ -f "$BACKUP_DIR/$restore_file" ]; then
                echo -e "${RED}WARNING: This will overwrite the current database!${NC}"
                read -p "Are you sure? (yes/no): " confirm
                if [ "$confirm" = "yes" ]; then
                    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$BACKUP_DIR/$restore_file"
                    echo -e "${GREEN}Database restored from $restore_file${NC}"
                fi
            else
                echo -e "${RED}Backup file not found${NC}"
            fi
            ;;
    esac
    
    pause
}

# Process Management
process_management() {
    echo -e "${BLUE}=== Process Management ===${NC}"
    
    echo -e "${YELLOW}PM2 Process List:${NC}"
    pm2 list
    echo ""
    
    echo -e "${YELLOW}Application Processes:${NC}"
    ps aux | grep -E "(node|npm|fojournal)" | grep -v grep
    echo ""
    
    echo -e "${YELLOW}System Services:${NC}"
    systemctl status apache2 mysql --no-pager
    
    pause
}

# SSL Certificate Status
ssl_status() {
    echo -e "${BLUE}=== SSL Certificate Status ===${NC}"
    
    # Check certificate expiration
    echo -e "${YELLOW}SSL Certificate Information:${NC}"
    # Try common Apache SSL certificate locations
    if [ -f "/etc/ssl/certs/fojourn.crt" ]; then
        openssl x509 -in /etc/ssl/certs/fojourn.crt -text -noout | grep -A 2 "Validity"
    elif [ -f "/etc/apache2/ssl/fojourn.crt" ]; then
        openssl x509 -in /etc/apache2/ssl/fojourn.crt -text -noout | grep -A 2 "Validity"
    elif [ -f "/etc/ssl/apache2/fojourn.crt" ]; then
        openssl x509 -in /etc/ssl/apache2/fojourn.crt -text -noout | grep -A 2 "Validity"
    else
        echo "SSL certificate not found in common locations"
        echo "Check Apache virtual host configuration for certificate path"
    fi
    echo ""
    
    # Check Apache SSL configuration
    echo -e "${YELLOW}Apache SSL Configuration:${NC}"
    apache2ctl configtest
    
    pause
}

# Disk Space Usage
disk_usage() {
    echo -e "${BLUE}=== Disk Space Usage ===${NC}"
    
    echo -e "${YELLOW}Disk Usage Overview:${NC}"
    df -h
    echo ""
    
    echo -e "${YELLOW}Application Directory Size:${NC}"
    du -sh "$APP_DIR"
    echo ""
    
    echo -e "${YELLOW}Log Directory Size:${NC}"
    du -sh /var/log/*
    echo ""
    
    echo -e "${YELLOW}Largest Files in /var:${NC}"
    find /var -type f -size +100M -exec ls -lh {} \; 2>/dev/null | head -10
    
    pause
}

# Network Status
network_status() {
    echo -e "${BLUE}=== Network Status ===${NC}"
    
    echo -e "${YELLOW}Network Interfaces:${NC}"
    ip addr show
    echo ""
    
    echo -e "${YELLOW}Active Network Connections:${NC}"
    netstat -tulpn | grep LISTEN
    echo ""
    
    echo -e "${YELLOW}Firewall Status:${NC}"
    ufw status
    
    pause
}

# Environment Variables
env_variables() {
    echo -e "${BLUE}=== Environment Variables ===${NC}"
    
    echo -e "${YELLOW}Node.js Version:${NC}"
    node --version
    echo ""
    
    echo -e "${YELLOW}NPM Version:${NC}"
    npm --version
    echo ""
    
    echo -e "${YELLOW}PM2 Version:${NC}"
    pm2 --version
    echo ""
    
    echo -e "${YELLOW}Environment Variables from .env file:${NC}"
    echo "DB_HOST=$DB_HOST"
    echo "DB_PORT=$DB_PORT"
    echo "DB_NAME=$DB_NAME"
    echo "DB_USER=$DB_USER"
    echo "NODE_ENV=$NODE_ENV"
    echo "PORT=$PORT"
    echo "BACKEND_URL=$BACKEND_URL"
    echo "FRONTEND_URL=$FRONTEND_URL"
    echo ""
    
    echo -e "${YELLOW}Other Environment Variables:${NC}"
    env | grep -E "(NODE|APP|PM2)" | sort
    echo ""
    
    echo -e "${CYAN}Options:${NC}"
    echo "1) Reload .env file"
    echo "2) Show full .env file contents"
    echo "3) Return to main menu"
    read -p "Enter choice: " env_choice
    
    case $env_choice in
        1)
            echo -e "${YELLOW}Reloading environment variables...${NC}"
            load_env_variables
            ;;
        2)
            echo -e "${YELLOW}Current .env file contents:${NC}"
            if [ -f "$APP_DIR/backend/.env" ]; then
                cat "$APP_DIR/backend/.env"
            else
                echo -e "${RED}.env file not found${NC}"
            fi
            ;;
        3)
            return
            ;;
    esac
    
    pause
}

# Node.js Management
nodejs_management() {
    echo -e "${BLUE}=== Node.js Management ===${NC}"
    
    echo -e "${YELLOW}Current Node.js Version:${NC}"
    node --version
    echo ""
    
    echo -e "${YELLOW}Current NPM Version:${NC}"
    npm --version
    echo ""
    
    echo -e "${YELLOW}Required Node.js Version (from package.json):${NC}"
    if [ -f "$APP_DIR/backend/package.json" ]; then
        grep -A2 '"engines"' "$APP_DIR/backend/package.json" || echo "No engines specified"
    else
        echo "package.json not found"
    fi
    echo ""
    
    echo "Choose Node.js operation:"
    echo "1) Check Node.js compatibility"
    echo "2) Install Node.js 18 LTS (via NodeSource)"
    echo "3) Install Node.js 20 LTS (via NodeSource)"
    echo "4) Update NPM to latest"
    echo "5) Clear NPM cache"
    echo "6) Check installed global packages"
    read -p "Enter choice: " node_choice
    
    case $node_choice in
        1)
            echo -e "${YELLOW}Checking Node.js compatibility...${NC}"
            cd "$APP_DIR/backend"
            if npm ls > /dev/null 2>&1; then
                echo -e "${GREEN}✓ All packages are compatible with current Node.js version${NC}"
            else
                echo -e "${RED}✗ Some packages may be incompatible${NC}"
                echo "Run 'npm ls' for details"
            fi
            ;;
        2)
            echo -e "${YELLOW}Installing Node.js 18 LTS...${NC}"
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
            echo -e "${GREEN}Node.js 18 LTS installed${NC}"
            node --version
            npm --version
            ;;
        3)
            echo -e "${YELLOW}Installing Node.js 20 LTS...${NC}"
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
            echo -e "${GREEN}Node.js 20 LTS installed${NC}"
            node --version
            npm --version
            ;;
        4)
            echo -e "${YELLOW}Updating NPM to latest version...${NC}"
            npm install -g npm@latest
            echo -e "${GREEN}NPM updated${NC}"
            npm --version
            ;;
        5)
            echo -e "${YELLOW}Clearing NPM cache...${NC}"
            npm cache clean --force
            echo -e "${GREEN}NPM cache cleared${NC}"
            ;;
        6)
            echo -e "${YELLOW}Global NPM packages:${NC}"
            npm list -g --depth=0
            ;;
    esac
    
    pause
}

# Update System Packages
update_system() {
    echo -e "${BLUE}=== Update System Packages ===${NC}"
    
    echo -e "${YELLOW}Updating package lists...${NC}"
    apt update
    
    echo -e "${YELLOW}Available updates:${NC}"
    apt list --upgradable
    
    read -p "Proceed with updates? (y/n): " update_confirm
    if [ "$update_confirm" = "y" ]; then
        echo -e "${YELLOW}Upgrading packages...${NC}"
        apt upgrade -y
        echo -e "${GREEN}System packages updated!${NC}"
    fi
    
    pause
}

# Clean Logs & Temp Files
clean_system() {
    echo -e "${BLUE}=== Clean Logs & Temp Files ===${NC}"
    
    echo -e "${YELLOW}Cleaning system logs...${NC}"
    journalctl --vacuum-time=7d
    
    echo -e "${YELLOW}Cleaning PM2 logs...${NC}"
    pm2 flush
    
    echo -e "${YELLOW}Cleaning old log files...${NC}"
    find /var/log -name "*.log.*" -type f -mtime +7 -delete
    
    echo -e "${YELLOW}Cleaning temporary files...${NC}"
    rm -rf /tmp/*
    
    echo -e "${YELLOW}Cleaning package cache...${NC}"
    apt autoclean
    
    echo -e "${GREEN}System cleaned!${NC}"
    pause
}

# Security Audit
security_audit() {
    echo -e "${BLUE}=== Security Audit ===${NC}"
    
    echo -e "${YELLOW}Failed Login Attempts:${NC}"
    grep "Failed password" /var/log/auth.log | tail -10
    echo ""
    
    echo -e "${YELLOW}Active SSH Sessions:${NC}"
    who
    echo ""
    
    echo -e "${YELLOW}Open Ports:${NC}"
    netstat -tulpn | grep LISTEN
    echo ""
    
    echo -e "${YELLOW}Firewall Rules:${NC}"
    ufw status numbered
    
    pause
}

# Main script loop
main() {
    while true; do
        show_header
        show_menu
        
        read -p "Enter your choice [0-19]: " choice
        
        case $choice in
            1) app_status ;;
            2) deploy_latest ;;
            3) restart_app ;;
            4) restart_services ;;
            5) view_app_logs ;;
            6) view_error_logs ;;
            7) view_system_logs ;;
            8) system_resources ;;
            9) database_management ;;
            10) backup_management ;;
            11) process_management ;;
            12) ssl_status ;;
            13) disk_usage ;;
            14) network_status ;;
            15) env_variables ;;
            16) nodejs_management ;;
            17) update_system ;;
            18) clean_system ;;
            19) security_audit ;;
            0) 
                echo -e "${GREEN}Goodbye!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid option. Please try again.${NC}"
                sleep 2
                ;;
        esac
    done
}

# Check if running as root for certain operations
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}Note: Some operations may require sudo privileges${NC}"
    echo ""
fi

# Start the main menu
main