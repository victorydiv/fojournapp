# Automated DreamHost Deployment Instructions

This repository now includes automated deployment scripts to make deploying to DreamHost much more efficient.

## Files Created

### Local Preparation Scripts
- **`prepare-deploy.sh`** - Bash script for Linux/Mac to prepare deployment
- **`prepare-deploy.bat`** - Windows batch script to prepare deployment
- **`deploy-dreamhost-auto.sh`** - Full automated deployment script (run on DreamHost)
- **`quick-deploy.sh`** - Quick deployment script (run on DreamHost after upload)

## Quick Deployment Process

### Option 1: Full Automation (Recommended)

1. **Upload the auto-deployment script to DreamHost:**
   ```bash
   scp deploy-dreamhost-auto.sh victorydiv24@fojourn.site:~/
   ```

2. **SSH into DreamHost and run:**
   ```bash
   ssh victorydiv24@fojourn.site
   chmod +x deploy-dreamhost-auto.sh
   ./deploy-dreamhost-auto.sh
   ```

3. **Follow the prompts** - the script will ask for your database password and handle everything else automatically.

### Option 2: Local Preparation + Quick Deploy

1. **Run preparation script locally:**
   
   **On Windows:**
   ```cmd
   prepare-deploy.bat
   ```
   
   **On Linux/Mac:**
   ```bash
   chmod +x prepare-deploy.sh
   ./prepare-deploy.sh
   ```

2. **Update configuration files:**
   - Edit `backend/.env.production` with your database password and JWT secret
   - Upload all files to DreamHost (excluding node_modules)

3. **SSH into DreamHost and run quick deploy:**
   ```bash
   ssh victorydiv24@fojourn.site
   cd ~/fojourn.site/fojournapp
   chmod +x quick-deploy.sh
   ./quick-deploy.sh
   ```

## What the Scripts Do

### Preparation Scripts
- ✅ Create production environment files
- ✅ Fix the infinite loop in package.json
- ✅ Install and test dependencies locally
- ✅ Build frontend to verify everything works
- ✅ Create .htaccess template

### Deployment Scripts
- ✅ Install npm locally if not available
- ✅ Install PM2 for process management
- ✅ Clone/update repository
- ✅ Install backend and frontend dependencies
- ✅ Configure environment variables
- ✅ Build and deploy frontend
- ✅ Set up directories and permissions
- ✅ Configure .htaccess for routing
- ✅ Import database schema
- ✅ Start application with PM2
- ✅ Create management scripts

## Management Scripts Created

After deployment, these scripts will be available in your home directory:

- **`~/restart-app.sh`** - Restart the application
- **`~/view-logs.sh`** - View application logs
- **`~/app-status.sh`** - Check application status
- **`~/update-app.sh`** - Pull updates and redeploy

## Manual PM2 Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs fojourn-travel-log

# Restart application
pm2 restart fojourn-travel-log

# Stop application
pm2 stop fojourn-travel-log

# Monitor resources
pm2 monit
```

## Configuration Required

Before running the deployment, you need:

1. **DreamHost MySQL Database:**
   - Database name: `victorydiv24_travel_log`
   - Username: `victorydiv24_dbuser`
   - Password: [your password]
   - Host: `mysql.fojourn.site`

2. **Domain Setup:**
   - Domain: `fojourn.site`
   - SSH access enabled
   - Node.js enabled (if available)

## Troubleshooting

### If deployment fails:
1. Check the error messages
2. Verify database credentials
3. Ensure SSH access is working
4. Check if Node.js is available on DreamHost

### If the app doesn't start:
1. Check PM2 logs: `pm2 logs fojourn-travel-log`
2. Verify environment variables in `backend/.env`
3. Test database connection manually
4. Check .htaccess configuration

### If frontend doesn't load:
1. Verify files are in `~/fojourn.site/` directory
2. Check .htaccess in web root
3. Clear browser cache
4. Check for build errors

## Benefits of Automated Deployment

- ⚡ **5-minute deployment** instead of manual 30+ minute process
- 🔧 **Automated environment setup** with proper configuration
- 📦 **PM2 process management** with automatic restarts
- 🛠️ **Management scripts** for easy maintenance
- ✅ **Error checking** and validation at each step
- 🔄 **Easy updates** with the update script

## Security Notes

- JWT secrets are generated automatically
- Database passwords are prompted (not stored in scripts)
- Production environment variables are properly configured
- Security headers are included in .htaccess

Your Travel Log application will be up and running on `https://fojourn.site` with full functionality!
