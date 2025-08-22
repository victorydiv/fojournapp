# DreamHost Shared Hosting Deployment Guide

## 🚀 Quick No-Sudo Deployment

**Use this script for DreamHost shared hosting:**
```bash
chmod +x deploy-no-sudo.sh
./deploy-no-sudo.sh
```

This script:
- ✅ Works without sudo access
- ✅ Installs PM2 in user space (`$HOME/.local/bin`)
- ✅ Sets up user-level cron for health monitoring
- ✅ Avoids all system-level permissions

## 🔧 DreamHost-Specific Limitations

### What DOESN'T work on DreamHost Shared Hosting:
- ❌ `sudo` commands (not available)
- ❌ System-wide PM2 installation
- ❌ System cron jobs (`cron_restart` in PM2 config)
- ❌ `pm2-logrotate` (requires sudo)
- ❌ PM2 startup scripts (require root)

### What DOES work:
- ✅ User-space PM2 installation (`npm install -g pm2 --prefix=$HOME/.local`)
- ✅ User crontab (`crontab -e`)
- ✅ Manual log rotation with user scripts
- ✅ PM2 process management as user
- ✅ Health monitoring via user cron jobs

## 📋 Manual Commands for DreamHost

### Install PM2 locally:
```bash
npm install -g pm2 --prefix=$HOME/.local
export PATH="$HOME/.local/bin:$PATH"
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
```

### Start your app:
```bash
cd /path/to/your/app
pm2 start ecosystem.config.js --env production
pm2 save
```

### Setup health monitoring (user cron):
```bash
# Create health check script
cat > $HOME/health-check.sh << 'EOF'
#!/bin/bash
export PATH="$HOME/.local/bin:$PATH"
if ! curl -f -s http://127.0.0.1:3000/health > /dev/null; then
    cd "$HOME/fojourn.site"  # Your app directory
    pm2 restart fojourn-travel-log
fi
EOF

chmod +x $HOME/health-check.sh

# Add to user crontab
(crontab -l; echo "*/10 * * * * $HOME/health-check.sh") | crontab -
```

## 🏥 Health Check Commands

```bash
# Check PM2 status
pm2 status

# Test health endpoint
curl http://127.0.0.1:3000/health

# View recent logs
pm2 logs fojourn-travel-log --lines 50

# Restart if needed
pm2 restart fojourn-travel-log

# Check user cron jobs
crontab -l
```

## 🚨 If Backend is Not Responding

1. **Check if PM2 process is running:**
   ```bash
   pm2 status
   ```

2. **If process is stopped, restart it:**
   ```bash
   pm2 restart fojourn-travel-log
   ```

3. **If restart fails, start fresh:**
   ```bash
   pm2 delete fojourn-travel-log
   pm2 start ecosystem.config.js --env production
   pm2 save
   ```

4. **Check health endpoint:**
   ```bash
   curl -v http://127.0.0.1:3000/health
   ```

5. **Check for port conflicts:**
   ```bash
   netstat -tulpn | grep :3000
   ```

## 📁 Important Paths for DreamHost

- **App directory:** `$HOME/fojourn.site/` (adjust for your domain)
- **PM2 binary:** `$HOME/.local/bin/pm2`
- **User scripts:** `$HOME/` (home directory)
- **Logs:** `$HOME/fojourn.site/logs/`

## 🔄 Nightly Restart Without Sudo

Since PM2's `cron_restart` requires system permissions, set up a user cron job:

```bash
# Add nightly restart at 3 AM via user crontab
(crontab -l; echo "0 3 * * * $HOME/.local/bin/pm2 restart fojourn-travel-log") | crontab -
```

## 📊 Monitoring Without Sudo

User-level monitoring setup:
```bash
# Every 5 minutes health check
*/5 * * * * $HOME/health-check.sh

# Daily log rotation at 2 AM  
0 2 * * * $HOME/log-rotation.sh

# Nightly restart at 3 AM
0 3 * * * $HOME/.local/bin/pm2 restart fojourn-travel-log
```

## 🆘 Troubleshooting

### PM2 command not found:
```bash
source ~/.bashrc
# or
export PATH="$HOME/.local/bin:$PATH"
```

### App won't start:
```bash
cd /path/to/your/app/backend
node server.js  # Test directly
```

### Health check fails:
```bash
# Check if port 3000 is in use
netstat -tulpn | grep :3000

# Check backend logs
pm2 logs fojourn-travel-log
```

### Cron jobs not working:
```bash
# Check cron service (may not be available on shared hosting)
# Check cron logs (may not be accessible)
# Test script manually:
$HOME/health-check.sh
```

This setup ensures your app runs reliably on DreamHost shared hosting without requiring any sudo privileges!
