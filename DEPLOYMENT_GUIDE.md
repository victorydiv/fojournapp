# DreamHost Shared Hosting Deployment Guide

This guide will walk you through deploying the Travel Log Application on DreamHost shared hosting.

## Prerequisites

- DreamHost shared hosting account
- Domain name configured in DreamHost panel
- SSH access to your hosting account
- MySQL database created through DreamHost panel
- Basic command line knowledge

## Important Limitations

DreamHost shared hosting has these constraints:
- No sudo access (only access to /home/victorydiv24/)
- No ability to install global packages
- No PM2 or process managers
- Limited Node.js version control
- Must use DreamHost's provided services

## Step 1: DreamHost Panel Setup

### Create MySQL Database
1. **Log into DreamHost Panel**
2. **Navigate to Goodies > MySQL Databases**
3. **Create a new database:**
   - Database Name: `victorydiv24_travel_log`
   - Use the auto-generated username: `victorydiv24_dbuser`
   - Set a strong password
   - Note down the hostname (usually `mysql.yourdomain.com`)

### Enable Node.js (if available)
1. **Navigate to Goodies > Node.js**
2. **Enable Node.js for your domain**
3. **Note the Node.js version provided**

### SSH Access Setup
1. **Navigate to Users > Manage Users**
2. **Enable SSH for your user**
3. **Note your SSH hostname and username**

## Step 2: Connect to Your Account

### SSH Connection
```bash
ssh victorydiv24@fojourn.site
# or use the SSH hostname provided by DreamHost
```

### Navigate to your domain directory
```bash
cd ~/fojourn.site
# or wherever your domain files are located
```

## Step 3: Check Available Tools

### Check Node.js availability
```bash
# Check if Node.js is available
node --version
npm --version

# If you get "command not found" for npm but node works, that's common on DreamHost
```

**If Node.js is available but npm is NOT (common on DreamHost shared):**

This is a typical DreamHost setup. You can work around this:

**Option A: Install npm locally (Recommended)**
```bash
# Download and install npm in your home directory
cd ~
wget https://npmjs.org/install.sh
sh install.sh

# Add npm to your PATH
echo 'export PATH=$HOME/node_modules/.bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Verify npm is now available
npm --version
```

**Option B: Use npx with Node.js**
```bash
# If npx is available
npx --version

# You can use npx instead of npm for some commands
```

**Option C: Local Build + Upload (Alternative)**
1. Build the frontend on your local computer
2. Upload only the built files to DreamHost
3. Use Node.js on DreamHost just to run the backend

### Check available space
```bash
# Check your disk usage (alternative to quota)
du -sh ~
df -h ~

# List your home directory
ls -la ~/

# Check specific directory sizes
du -sh ~/yourdomain.com 2>/dev/null || echo "Domain directory not found yet"
```

## Step 4: Deploy Application Code

### Upload your application
**Option A: Git Clone (if git is available)**
```bash
cd ~/yourdomain.com
git clone https://github.com/victorydiv/fojournapp.git
cd fojournapp
```

**Option B: File Upload via SFTP/FTP**
- Use FileZilla, WinSCP, or similar FTP client
- Upload your application files to `~/yourdomain.com/fojournapp/`

### Install npm and dependencies

**Since Node.js is available but npm is not, let's install npm locally:**

```bash
cd ~
# Download and install npm
curl -L https://npmjs.org/install.sh | sh

# Add npm to PATH for this session
export PATH=$HOME/node_modules/.bin:$PATH

# Make it permanent
echo 'export PATH=$HOME/node_modules/.bin:$PATH' >> ~/.bashrc

# Verify npm is working
npm --version
```

**Now install dependencies and build:**

**⚠️ Important: The root package.json has a postinstall script that causes an infinite loop. Skip it and install manually:**

```bash
cd ~/yourdomain.com/fojournapp

# DO NOT run "npm install" in the root directory - it will cause an infinite loop
# Instead, install dependencies manually for each part:

# Install backend dependencies first
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend  
npm install

# Build the frontend
npm run build
cd ..

# Now you can copy the built files
cp -r frontend/build/* ~/yourdomain.com/
```

**Alternative: Fix the infinite loop first, then install normally:**

```bash
cd ~/yourdomain.com/fojournapp

# Temporarily disable the problematic postinstall script
cp package.json package.json.backup
sed -i 's/"postinstall"/#"postinstall"/g' package.json

# Now you can safely run npm install
npm install

# Restore the original package.json if needed
mv package.json.backup package.json

# Continue with frontend and backend
cd frontend && npm install && npm run build && cd ..
cd backend && npm install && cd ..
```

**Alternative: If npm installation fails, build locally:**

1. **On your local computer:**
   ```bash
   # Navigate to your project
   cd /path/to/your/fojournapp
   
   # Install dependencies and build
   npm install
   cd frontend
   npm install
   npm run build
   ```

2. **Upload to DreamHost:**
   - Upload `frontend/build/` contents to `~/yourdomain.com/`
   - Upload `backend/` folder to `~/yourdomain.com/fojournapp/backend/`
   - Upload `database/` folder to `~/yourdomain.com/fojournapp/database/`
   - Upload `node_modules/` from backend to `~/yourdomain.com/fojournapp/backend/node_modules/`

## Step 5: Environment Configuration

### Create production environment file
```bash
cd ~/yourdomain.com/fojournapp/backend
cp .env.production .env
# Edit .env with your actual values
nano .env
```

Configure `.env` with DreamHost-specific settings:
```env
# Production Environment Configuration
NODE_ENV=production
PORT=3000

# DreamHost Database Configuration
DB_HOST=mysql.yourdomain.com
DB_PORT=3306
DB_USER=victorydiv24_dbuser
DB_PASSWORD=your_database_password
DB_NAME=victorydiv24_travel_log

# JWT Secret (generate a strong random string)
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random

# Google Maps API Key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# File Upload Settings - DreamHost paths
MAX_FILE_SIZE=50000000
UPLOAD_PATH=/home/victorydiv24/yourdomain.com/fojournapp/backend/uploads
```

### Set up uploads directory
```bash
# Create uploads directory in your home space
mkdir -p ~/yourdomain.com/fojournapp/backend/uploads
chmod 755 ~/yourdomain.com/fojournapp/backend/uploads
```

## Step 6: Database Setup

### Import database schema
```bash
cd ~/yourdomain.com/fojournapp

# Import schema using DreamHost's MySQL
mysql -h mysql.yourdomain.com -u victorydiv24_dbuser -p victorydiv24_travel_log < database/schema.sql
```

### Verify database setup
```bash
mysql -h mysql.yourdomain.com -u victorydiv24_dbuser -p victorydiv24_travel_log -e "SHOW TABLES;"
```

## Step 7: PM2 Configuration and Deployment

### Since DreamHost supports PM2, we can use it for process management!

### Install PM2 globally (if not already installed)
```bash
# Check if PM2 is available
pm2 --version

# If not available, install it
npm install -g pm2

# If you can't install globally, install locally
npm install pm2
```

### Create logs directory
```bash
cd ~/fojourn.site/fojournapp
mkdir -p logs
```

### Start the application with PM2
```bash
# Navigate to your app directory
cd ~/fojourn.site/fojournapp

# Start the app using the ecosystem configuration
pm2 start ecosystem.config.js --env production

# Or start manually if config doesn't work
pm2 start backend/server.js --name "fojourn-travel-log" --cwd ./backend

# Check if it's running
pm2 status
pm2 logs fojourn-travel-log
```

### PM2 Management Commands
```bash
# View all processes
pm2 list

# View logs
pm2 logs fojourn-travel-log

# Restart the app
pm2 restart fojourn-travel-log

# Stop the app
pm2 stop fojourn-travel-log

# Delete the app from PM2
pm2 delete fojourn-travel-log

# Monitor resources
pm2 monit

# Save PM2 configuration
pm2 save

# Generate startup script
pm2 startup
```

### Alternative: Manual PM2 Start
If the ecosystem config doesn't work, start manually:
```bash
cd ~/fojourn.site/fojournapp

pm2 start backend/server.js \
  --name "fojourn-travel-log" \
  --cwd ./backend \
  --env NODE_ENV=production \
  --env PORT=3000 \
  --log ./logs/combined.log \
  --error ./logs/err.log \
  --out ./logs/out.log
```

### Create passenger_wsgi.py for Python support (if needed)
```bash
cat > ~/yourdomain.com/passenger_wsgi.py << 'EOF'
import sys
import os

# Add your project directory to the Python path
sys.path.insert(0, os.path.dirname(__file__))

def application(environ, start_response):
    start_response('200 OK', [('Content-Type', 'text/plain')])
    return [b'Node.js app - see .htaccess for routing']
EOF
```

## Step 8: Configure DreamHost to Serve Your App

### Create .htaccess file for URL routing
Create `~/yourdomain.com/.htaccess`:
```apache
RewriteEngine On

# Handle Node.js application
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /fojournapp/public/index.html [L]

# Handle API routes - redirect to your Node.js process
RewriteRule ^api/(.*)$ http://localhost:3000/api/$1 [P,L]
```

### Create a startup script
Create `~/yourdomain.com/start-app.sh`:
```bash
#!/bin/bash
cd ~/yourdomain.com/fojournapp
nohup node app.js > app.log 2>&1 &
echo "Travel Log app started"
```

Make it executable:
```bash
chmod +x ~/yourdomain.com/start-app.sh
```

### Set up static file serving
Copy built frontend to public directory:
```bash
mkdir -p ~/yourdomain.com/public
cp -r ~/yourdomain.com/fojournapp/frontend/build/* ~/yourdomain.com/public/
```

## Step 9: Alternative Deployment Strategy

Since DreamHost shared hosting has limitations with Node.js applications, consider these alternatives:

### Option A: Use DreamHost's Node.js hosting
1. **Enable Node.js in DreamHost panel**
2. **Follow DreamHost's Node.js setup guide**
3. **Use their provided process management**

### Option B: Frontend-only deployment with external API
1. **Deploy only the React frontend to DreamHost**
2. **Host the Node.js backend on:**
   - Heroku (free tier available)
   - Railway
   - Render
   - DigitalOcean App Platform

### Option C: Convert to PHP backend
1. **Rewrite the backend in PHP** (which DreamHost fully supports)
2. **Keep the React frontend**
3. **Use DreamHost's MySQL directly**

## Step 10: Recommended Solution - Hybrid Deployment

Given DreamHost shared hosting limitations, here's the recommended approach:

### Deploy Frontend to DreamHost
```bash
# Since you now have npm working, you can build on DreamHost
cd ~/yourdomain.com/fojournapp/frontend
npm run build

# Copy built files to web root
cp -r build/* ~/yourdomain.com/

# Or if npm still doesn't work, copy pre-built files:
# cp -r build/* ~/yourdomain.com/
```

### Deploy Backend to External Service

**Option 1: Railway (Recommended)**
1. Push your code to GitHub
2. Connect Railway to your GitHub repo
3. Add environment variables in Railway dashboard
4. Get your Railway app URL

**Option 2: Render**
1. Connect Render to your GitHub repo
2. Choose "Web Service" 
3. Set build command: `cd backend && npm install`
4. Set start command: `cd backend && npm start`

**Option 3: Heroku**
1. Install Heroku CLI
2. Create new Heroku app
3. Push backend code
4. Add PostgreSQL or MySQL addon

### Update Frontend Configuration
Edit your React app's API configuration to point to your external backend:

Create `~/yourdomain.com/config.js`:
```javascript
window.APP_CONFIG = {
  API_BASE_URL: 'https://your-railway-app.railway.app'
  // or your Render/Heroku URL
};
```

Include this in your `index.html`:
```html
<script src="/config.js"></script>
```

## Step 11: Testing and Verification

### Test frontend deployment
1. **Visit your domain**: `https://yourdomain.com`
2. **Check if React app loads**
3. **Verify static files are served**

### Test API connectivity
1. **Open browser developer tools**
2. **Check network requests**
3. **Verify API calls reach your external backend**

### Test full application
1. **User registration**
2. **Login functionality**
3. **Creating travel entries**
4. **File uploads**
5. **Google Maps integration**

## Step 12: Maintenance and Monitoring

### Database Backups
Create backup script `~/backup-db.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$HOME/backups"
mkdir -p $BACKUP_DIR

# Database backup using DreamHost MySQL
mysqldump -h mysql.yourdomain.com -u victorydiv24_dbuser -p'your_password' victorydiv24_travel_log > $BACKUP_DIR/travel_log_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "travel_log_*" -mtime +7 -delete

echo "Backup completed: $DATE"
```

### Monitoring
Since you can't use traditional monitoring tools:
1. **Check logs regularly** in your home directory
2. **Monitor disk usage**: `du -sh ~` and `df -h`
3. **Use DreamHost panel** for basic monitoring and disk usage stats
4. **Set up external monitoring** like UptimeRobot for your frontend

### File Management
```bash
# Check disk usage
du -sh ~/yourdomain.com/

# Check available space
df -h ~

# Clean up old logs
find ~/yourdomain.com/ -name "*.log" -mtime +30 -delete

# Monitor uploads directory
ls -la ~/yourdomain.com/fojournapp/backend/uploads/

# Check largest files/directories
du -sh ~/yourdomain.com/* | sort -h
```

## Troubleshooting DreamHost-Specific Issues

### Common Problems and Solutions

**Node.js not available:**
```bash
# Check if Node.js is installed
which node
node --version

# If not available, contact DreamHost support or use external hosting for backend
```

**Database connection issues:**
```bash
# Test connection to DreamHost MySQL
mysql -h mysql.yourdomain.com -u victorydiv24_dbuser -p

# Check if database exists
mysql -h mysql.yourdomain.com -u victorydiv24_dbuser -p -e "SHOW DATABASES;"
```

**File upload permissions:**
```bash
# Check and fix upload directory permissions
ls -la ~/yourdomain.com/fojournapp/backend/uploads/
chmod 755 ~/yourdomain.com/fojournapp/backend/uploads/
```

**Frontend not loading:**
```bash
# Check if files are in web root
ls -la ~/yourdomain.com/

# Verify .htaccess configuration
cat ~/yourdomain.com/.htaccess
```

## Alternative: Full External Hosting

If DreamHost shared hosting proves too limiting, consider these alternatives:

### Complete External Solutions
1. **Railway**: Deploy both frontend and backend
2. **Vercel**: Frontend + Railway/Render backend
3. **Netlify**: Frontend + Heroku/Railway backend
4. **DigitalOcean App Platform**: Full-stack deployment

### Migration Strategy
1. **Keep domain with DreamHost**
2. **Point DNS to external hosting**
3. **Use DreamHost only for domain/DNS management**

## Security Considerations for Shared Hosting

### Limited Security Controls
- No firewall management
- No server-level security
- Rely on DreamHost's security measures

### Application-Level Security
```javascript
// Add extra security headers in your Node.js app
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});
```

### Database Security
- Use strong passwords
- Limit database user privileges
- Regular backups

## Performance Optimization for Shared Hosting

### Frontend Optimization
```bash
# Optimize build for production
cd ~/yourdomain.com/fojournapp/frontend
npm run build

# Compress assets
gzip -9 build/static/js/*.js
gzip -9 build/static/css/*.css
```

### Caching Strategy
```apache
# Add to .htaccess for better caching
<IfModule mod_expires.c>
ExpiresActive on
ExpiresByType text/css "access plus 1 year"
ExpiresByType application/javascript "access plus 1 year"
ExpiresByType image/png "access plus 1 year"
ExpiresByType image/jpeg "access plus 1 year"
</IfModule>
```

## Summary

DreamHost shared hosting has significant limitations for Node.js applications. The recommended approach is:

1. **✅ Deploy React frontend to DreamHost** (works perfectly)
2. **✅ Use DreamHost MySQL** (included in hosting)
3. **✅ Deploy Node.js backend externally** (Railway, Render, Heroku)
4. **✅ Configure frontend to use external API**

This hybrid approach gives you:
- Professional domain management with DreamHost
- Reliable frontend hosting
- Powerful backend hosting with external services
- Database hosting with DreamHost
- Best of both worlds!

Your Travel Log Application will work beautifully with this setup!
