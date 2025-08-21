# PM2 Crash Recovery Guide for Fojourn Travel Log

## Quick Commands for Production Crashes

### 1. Check if the app is running
```bash
pm2 status
pm2 info fojourn-travel-log
```

### 2. If crashed, restart immediately
```bash
pm2 restart fojourn-travel-log
```

### 3. If restart fails, stop and start fresh
```bash
pm2 stop fojourn-travel-log
pm2 start ecosystem.config.js --env production
pm2 save
```

### 4. Check logs to understand the crash
```bash
# View recent logs
pm2 logs fojourn-travel-log --lines 100

# View only error logs
pm2 logs fojourn-travel-log --err --lines 50

# Follow live logs
pm2 logs fojourn-travel-log --lines 0
```

### 5. Monitor in real-time
```bash
pm2 monit
```

## Automatic Restart Configuration

Your updated `ecosystem.config.js` now includes:

- **autorestart: true** - Automatically restart on crash
- **max_restarts: 10** - Maximum 10 restarts per minute
- **min_uptime: "10s"** - App must run 10s to count as successful start
- **exp_backoff_restart_delay: 100** - Exponential backoff on repeated crashes
- **max_memory_restart: "200M"** - Restart if memory usage exceeds 200MB

## Setup PM2 to Start on Server Boot

1. Run this command to generate startup script:
```bash
pm2 startup
```

2. Copy and run the generated command as root/sudo

3. Save current PM2 processes:
```bash
pm2 save
```

## Common Crash Scenarios and Solutions

### Memory Leaks
- **Symptom**: App restarts due to memory limit
- **Solution**: Check logs for memory usage patterns
- **Command**: `pm2 info fojourn-travel-log` (check memory usage)

### Database Connection Issues
- **Symptom**: Database connection errors in logs
- **Solution**: Check database server status and connection strings
- **Command**: `pm2 logs fojourn-travel-log --err`

### Port Already in Use
- **Symptom**: "EADDRINUSE" error
- **Solution**: Kill process using port or change port
- **Commands**: 
  ```bash
  netstat -tulpn | grep :3000
  pm2 delete fojourn-travel-log
  pm2 start ecosystem.config.js --env production
  ```

### File Permission Issues
- **Symptom**: "EACCES" errors
- **Solution**: Check file permissions on uploads folder
- **Commands**:
  ```bash
  chmod -R 755 backend/uploads
  chown -R www-data:www-data backend/uploads
  ```

## Monitoring Commands

### Daily Health Check
```bash
# Quick status check
pm2 status

# Check if any restarts happened
pm2 info fojourn-travel-log

# Check recent error logs
pm2 logs fojourn-travel-log --err --lines 20
```

### Weekly Maintenance
```bash
# Flush old logs
pm2 flush

# Reset restart counters
pm2 reset fojourn-travel-log

# Check memory usage trends
pm2 monit
```

## Emergency Recovery Steps

If the app keeps crashing repeatedly:

1. **Stop the app completely**:
   ```bash
   pm2 stop fojourn-travel-log
   ```

2. **Check the server logs directly**:
   ```bash
   cd backend && node server.js
   ```

3. **Fix the issue based on direct error output**

4. **Restart with PM2**:
   ```bash
   pm2 start ecosystem.config.js --env production
   ```

## Prevention Tips

1. **Monitor logs regularly**: `pm2 logs fojourn-travel-log`
2. **Check memory usage**: `pm2 monit`
3. **Keep dependencies updated**: Regular `npm audit` and updates
4. **Monitor disk space**: Crashes often happen when disk is full
5. **Database health**: Regular database maintenance and connection monitoring

## Quick Deployment with Restart Protection

When deploying new code:

```bash
# Deploy new code
git pull origin master
cd backend && npm install

# Graceful restart (zero downtime)
pm2 reload fojourn-travel-log

# If reload fails, fallback to restart
pm2 restart fojourn-travel-log
```

## Useful PM2 Commands Reference

```bash
# Process management
pm2 start ecosystem.config.js --env production  # Start app
pm2 restart fojourn-travel-log                  # Restart app
pm2 reload fojourn-travel-log                   # Zero-downtime restart
pm2 stop fojourn-travel-log                     # Stop app
pm2 delete fojourn-travel-log                   # Remove from PM2

# Monitoring
pm2 status                                       # Show all processes
pm2 info fojourn-travel-log                     # Detailed app info
pm2 monit                                        # Real-time monitoring
pm2 list                                         # List all processes

# Logs
pm2 logs fojourn-travel-log                     # Show logs
pm2 logs fojourn-travel-log --err               # Error logs only
pm2 logs fojourn-travel-log --lines 100         # Last 100 lines
pm2 flush                                        # Clear all logs

# Maintenance
pm2 reset fojourn-travel-log                    # Reset counters
pm2 save                                         # Save current processes
pm2 resurrect                                    # Restore saved processes
```
