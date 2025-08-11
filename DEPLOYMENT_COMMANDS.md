# DreamHost Shared Hosting Quick Deployment Commands

## One-Line Automated Deployment
```bash
bash deploy-dreamhost-shared.sh
```

## Manual Step-by-Step Commands for DreamHost Shared Hosting

### 1. Initial Setup
```bash
# Connect to DreamHost via SSH
ssh victorydiv24@yourdomain.com

# Check available tools
node --version  # May not be available
mysql --version
quota -u  # Check disk space
```

### 2. Directory Setup
```bash
# Navigate to your domain directory
cd ~/yourdomain.com

# Create application directory
mkdir -p fojournapp
cd fojournapp

# Upload your application files (via SFTP/Git)
# If git is available:
git clone https://github.com/victorydiv/fojournapp.git .
```

### 3. Database Setup (via DreamHost Panel)
```bash
# Test database connection
mysql -h mysql.yourdomain.com -u victorydiv24_dbuser -p victorydiv24_travel_log

# Import schema
mysql -h mysql.yourdomain.com -u victorydiv24_dbuser -p victorydiv24_travel_log < database/schema.sql

# Verify tables
mysql -h mysql.yourdomain.com -u victorydiv24_dbuser -p victorydiv24_travel_log -e "SHOW TABLES;"
```

### 4. Frontend Deployment (Local Build Recommended)
```bash
# If Node.js is available on DreamHost:
cd frontend
npm install
npm run build

# Copy built files to web root
cp -r build/* ~/yourdomain.com/

# If Node.js is NOT available:
# Build locally on your computer, then upload the build folder contents
```

### 5. Backend Configuration
```bash
# Create environment file
cd ~/yourdomain.com/fojournapp/backend
cp .env.production .env

# Edit with your actual values
nano .env
```

### 6. Frontend Configuration
```bash
# Create .htaccess for React routing
cat > ~/yourdomain.com/.htaccess << 'EOF'
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [L]
EOF

# Create config for external backend (recommended)
cat > ~/yourdomain.com/config.js << 'EOF'
window.APP_CONFIG = {
    API_BASE_URL: 'https://your-backend-url.railway.app'
};
EOF
```

## Recommended: Hybrid Deployment Strategy

### Frontend on DreamHost + Backend on External Service

**1. Deploy Frontend to DreamHost**
```bash
# Build frontend locally
cd frontend
npm run build

# Upload build/* contents to ~/yourdomain.com/
# Or use the automated script: bash deploy-dreamhost-shared.sh
```

**2. Deploy Backend to Railway (Recommended)**
```bash
# Push your backend to GitHub
git add .
git commit -m "Prepare for Railway deployment"
git push origin main

# On Railway.app:
# 1. Connect GitHub repository
# 2. Deploy backend folder
# 3. Add environment variables
# 4. Get your Railway URL
```

**3. Configure Frontend for External Backend**
```bash
# Update config on DreamHost
cat > ~/yourdomain.com/config.js << 'EOF'
window.APP_CONFIG = {
    API_BASE_URL: 'https://your-app.railway.app'
};
EOF

# Update index.html to include config
# Add: <script src="/config.js"></script>
```

## DreamHost Shared Hosting Management Commands

### Application Management
```bash
# Check application status (if running locally)
ps aux | grep node

# View application logs
tail -f ~/yourdomain.com/fojournapp/app.log

# Update application
cd ~/yourdomain.com/fojournapp
git pull
# Rebuild frontend if needed
```

### Database Management
```bash
# Connect to database
mysql -h mysql.yourdomain.com -u victorydiv24_dbuser -p victorydiv24_travel_log

# Backup database
mysqldump -h mysql.yourdomain.com -u victorydiv24_dbuser -p victorydiv24_travel_log > backup_$(date +%Y%m%d).sql

# Restore database
mysql -h mysql.yourdomain.com -u victorydiv24_dbuser -p victorydiv24_travel_log < backup_file.sql

# Check database size
mysql -h mysql.yourdomain.com -u victorydiv24_dbuser -p victorydiv24_travel_log -e "
SELECT 
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables 
WHERE table_schema = 'victorydiv24_travel_log';"
```

### File Management
```bash
# Check disk usage
quota -u
du -sh ~/yourdomain.com/

# Clean up old files
find ~/yourdomain.com/fojournapp/backend/uploads/ -name "*.log" -mtime +30 -delete

# Check file permissions
ls -la ~/yourdomain.com/fojournapp/backend/uploads/

# Fix permissions if needed
chmod 755 ~/yourdomain.com/fojournapp/backend/uploads/
```

### Monitoring and Maintenance
```bash
# Check website status
curl -I https://yourdomain.com

# Monitor disk space
df -h

# Check for large files
find ~/yourdomain.com/ -type f -size +10M -ls

# View recent logs
tail -f ~/yourdomain.com/fojournapp/app.log
```

## External Backend Management (Railway/Render/Heroku)

### Railway Commands
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy updates
railway up

# View logs
railway logs

# Check status
railway status
```

### Environment Variables for External Backend
```bash
# Set environment variables (Railway example)
railway variables set NODE_ENV=production
railway variables set DB_HOST=mysql.yourdomain.com
railway variables set DB_USER=victorydiv24_dbuser
railway variables set DB_PASSWORD=your_password
railway variables set DB_NAME=victorydiv24_travel_log
railway variables set JWT_SECRET=your_jwt_secret
railway variables set GOOGLE_MAPS_API_KEY=your_api_key
```

## Troubleshooting DreamHost Shared Hosting

### Common Issues and Solutions

**Frontend not loading:**
```bash
# Check if files are in web root
ls -la ~/yourdomain.com/

# Verify .htaccess exists and is correct
cat ~/yourdomain.com/.htaccess

# Check file permissions
ls -la ~/yourdomain.com/index.html
```

**API calls failing:**
```bash
# Check if external backend is running
curl -I https://your-backend-url.railway.app/api/health

# Verify config.js has correct backend URL
cat ~/yourdomain.com/config.js

# Check browser developer tools for CORS errors
```

**Database connection issues:**
```bash
# Test connection
mysql -h mysql.yourdomain.com -u victorydiv24_dbuser -p

# Check database exists
mysql -h mysql.yourdomain.com -u victorydiv24_dbuser -p -e "SHOW DATABASES;"

# Verify tables exist
mysql -h mysql.yourdomain.com -u victorydiv24_dbuser -p victorydiv24_travel_log -e "SHOW TABLES;"
```

**File upload issues:**
```bash
# Check uploads directory exists
ls -la ~/yourdomain.com/fojournapp/backend/uploads/

# Verify permissions
chmod 755 ~/yourdomain.com/fojournapp/backend/uploads/

# Check disk quota
quota -u
```

**Node.js not available:**
```bash
# Check if Node.js is available
which node
node --version

# If not available:
# 1. Contact DreamHost support
# 2. Use external backend deployment
# 3. Build frontend locally and upload
```

## Performance Optimization for Shared Hosting

### Frontend Optimization
```bash
# Enable compression in .htaccess
cat >> ~/yourdomain.com/.htaccess << 'EOF'
<IfModule mod_deflate.c>
AddOutputFilterByType DEFLATE text/plain text/html text/xml text/css application/xml application/xhtml+xml application/rss+xml application/javascript application/x-javascript
</IfModule>
EOF

# Cache static files
cat >> ~/yourdomain.com/.htaccess << 'EOF'
<IfModule mod_expires.c>
ExpiresActive on
ExpiresByType text/css "access plus 1 year"
ExpiresByType application/javascript "access plus 1 year"
ExpiresByType image/png "access plus 1 year"
ExpiresByType image/jpeg "access plus 1 year"
</IfModule>
EOF
```

### Database Optimization
```bash
# Check slow queries (if available)
mysql -h mysql.yourdomain.com -u victorydiv24_dbuser -p victorydiv24_travel_log -e "SHOW PROCESSLIST;"

# Optimize tables
mysql -h mysql.yourdomain.com -u victorydiv24_dbuser -p victorydiv24_travel_log -e "OPTIMIZE TABLE travel_entries, users, media_files;"
```

## Security Considerations

### DreamHost Shared Hosting Security
```bash
# Secure file permissions
find ~/yourdomain.com/ -type f -exec chmod 644 {} \;
find ~/yourdomain.com/ -type d -exec chmod 755 {} \;

# Protect sensitive files
cat > ~/yourdomain.com/fojournapp/backend/.htaccess << 'EOF'
Order deny,allow
Deny from all
EOF

# Hide .env files
cat >> ~/yourdomain.com/.htaccess << 'EOF'
<Files ".env*">
Order allow,deny
Deny from all
</Files>
EOF
```

### External Backend Security
```bash
# Ensure HTTPS is enabled
# Configure CORS properly for your domain
# Use environment variables for secrets
# Enable security headers
```

## Backup and Recovery

### Automated Backup Script
```bash
# Create comprehensive backup script
cat > ~/backup-all.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$HOME/backups"
mkdir -p $BACKUP_DIR

# Database backup
mysqldump -h mysql.yourdomain.com -u victorydiv24_dbuser -p'your_password' victorydiv24_travel_log > $BACKUP_DIR/travel_log_$DATE.sql

# Files backup
tar -czf $BACKUP_DIR/travel_log_files_$DATE.tar.gz ~/yourdomain.com/fojournapp/backend/uploads/

# Website backup
tar -czf $BACKUP_DIR/website_$DATE.tar.gz ~/yourdomain.com/ --exclude='~/yourdomain.com/fojournapp/backend/uploads/'

# Clean old backups (keep 7 days)
find $BACKUP_DIR -name "*_*" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x ~/backup-all.sh

# Run backup
~/backup-all.sh
```

## Summary

**✅ Recommended Setup for DreamHost Shared Hosting:**
1. **Frontend**: Deploy React app to DreamHost
2. **Database**: Use DreamHost MySQL 
3. **Backend**: Deploy to Railway/Render (better performance)
4. **Files**: Store uploads on external backend service
5. **Domain**: Managed through DreamHost

This hybrid approach maximizes the benefits of DreamHost while working around shared hosting limitations!
