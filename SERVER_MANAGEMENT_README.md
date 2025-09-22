# Production Server Management Script

This script provides a comprehensive management interface for the FoJourn production server via SSH.

## Installation on Production Server

1. Upload the script to your production server:
```bash
scp manage-server.sh user@your-server:/home/user/
```

2. SSH into your production server:
```bash
ssh user@your-server
```

3. Make the script executable:
```bash
chmod +x manage-server.sh
```

4. Set up environment variables (create a `.env` file or export variables):
```bash
export DB_PASSWORD="your_database_password"
```

## Usage

Run the script from your SSH session:
```bash
./manage-server.sh
```

## Features

The script provides the following management options:

### 1. Application Status & Health Check
- PM2 application status
- Application health endpoint check
- Database connection test
- Nginx service status
- System uptime

### 2. Deploy Latest from Git
- Pulls latest changes from master branch
- Installs/updates dependencies
- Builds the application
- Restarts the application via PM2

### 3. Restart Application
- Restarts the PM2 application
- Performs health check after restart

### 4. Restart All Services
- Restarts Nginx
- Restarts MySQL
- Restarts all PM2 processes

### 5. View Application Logs
- Live PM2 logs
- PM2 error logs
- PM2 output logs
- Custom application log files

### 6. View Error Logs
- Nginx error logs
- System error logs
- MySQL error logs

### 7. View System Logs
- System log (syslog)
- Authentication log
- Kernel log
- Boot log

### 8. System Resource Usage
- CPU usage
- Memory usage
- Top processes by CPU and memory
- System load average

### 9. Database Management
- Database status and size
- Running queries
- Create database backups
- List recent backups
- MySQL command line access

### 10. Backup Management
- Create full application backups
- List available backups
- Clean old backups (30+ days)
- Restore from backup

### 11. Process Management
- PM2 process list
- Application processes
- System service status

### 12. SSL Certificate Status
- Certificate expiration information
- Nginx SSL configuration validation

### 13. Disk Space Usage
- Overall disk usage
- Application directory size
- Log directory sizes
- Largest files in /var

### 14. Network Status
- Network interfaces
- Active network connections
- Firewall status

### 15. Environment Variables
- Node.js and NPM versions
- PM2 version
- Environment variables (filtered)

### 16. Update System Packages
- Update package lists
- Show available updates
- Upgrade system packages

### 17. Clean Logs & Temp Files
- Clean system logs
- Clean PM2 logs
- Remove old log files
- Clean temporary files
- Clean package cache

### 18. Security Audit
- Failed login attempts
- Active SSH sessions
- Open ports
- Firewall rules

## Configuration

### Script Variables
Update these variables at the top of the script to match your server setup:

```bash
APP_NAME="fojournal"
APP_DIR="/var/www/fojournal"
PM2_APP_NAME="fojournal"
LOG_DIR="/var/log/fojournal"
BACKUP_DIR="/var/backups/fojournal"
SERVICE_NAME="nginx"
```

### Required Environment Variables
- `DB_PASSWORD`: MySQL root password for database operations

### Permissions
Some operations require sudo privileges. Run with appropriate permissions or ensure your user has sudo access for:
- Service management (nginx, mysql)
- System package updates
- Log file access
- Backup operations

## Security Notes

- Store database passwords securely using environment variables
- Limit SSH access to authorized users only
- Review firewall rules regularly
- Monitor failed login attempts
- Keep system packages updated

## Troubleshooting

### Script Won't Run
```bash
# Make sure script is executable
chmod +x manage-server.sh

# Check if bash is available
which bash
```

### Permission Denied Errors
```bash
# Run with sudo for system operations
sudo ./manage-server.sh

# Or add user to required groups
sudo usermod -a -G www-data $USER
```

### Database Connection Issues
- Verify `DB_PASSWORD` environment variable is set
- Check MySQL service status
- Verify database user permissions

### PM2 Not Found
```bash
# Install PM2 globally
npm install -g pm2

# Or use full path
/usr/local/bin/pm2 status
```

## Backup Strategy

The script supports automated backups:
- Database backups are stored in `$BACKUP_DIR`
- Full backups include both database and application files
- Old backups (30+ days) can be automatically cleaned
- Backups are timestamped for easy identification

## Monitoring

Use the script regularly to:
- Check application health
- Monitor resource usage
- Review error logs
- Verify SSL certificate status
- Audit security events

## Quick Commands

For frequently used operations, you can create aliases:

```bash
# Add to ~/.bashrc
alias deploy='./manage-server.sh <<< "2"'
alias logs='./manage-server.sh <<< "5"'
alias status='./manage-server.sh <<< "1"'
alias restart='./manage-server.sh <<< "3"'
```

## Support

If you encounter issues:
1. Check the error logs via the script
2. Verify all services are running
3. Ensure proper permissions
4. Check available disk space
5. Review system resources

The script provides comprehensive diagnostics to help identify and resolve common issues.