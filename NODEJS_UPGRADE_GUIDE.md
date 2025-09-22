# Node.js Upgrade Guide for FoJourn Production

## Current Issue
Your production server is running an older Node.js version (likely 12.x or 13.x) that doesn't support modern JavaScript features like optional chaining (`?.`) used in newer packages like `express-rate-limit` v7.x.

## Recommended Solution: Upgrade to Node.js 18 LTS

### Why Node.js 18 LTS?
- **Long Term Support**: Supported until April 2025
- **Stability**: Battle-tested and stable
- **Modern Features**: Supports all modern JavaScript features your dependencies need
- **Security**: Regular security updates
- **Performance**: Significant performance improvements over older versions

### Pre-Upgrade Steps

1. **Backup Current State**
   ```bash
   # Use the management script option 10 for full backup
   ./manage-server.sh
   # Choose option 10 > 1 (Create Full Backup)
   ```

2. **Check Current Version**
   ```bash
   node --version
   npm --version
   ```

3. **Test Package Compatibility**
   ```bash
   cd ~/fojourn.site/fojournapp/backend
   npm ls
   ```

### Upgrade Process

#### Option 1: Using the Management Script (Recommended)
```bash
./manage-server.sh
# Choose option 16 (Node.js Management)
# Choose option 2 (Install Node.js 18 LTS)
```

#### Option 2: Manual Installation
```bash
# Remove old Node.js (if installed via package manager)
sudo apt-get remove nodejs npm

# Install Node.js 18 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher
```

### Post-Upgrade Steps

1. **Reinstall Dependencies**
   ```bash
   cd ~/fojourn.site/fojournapp/backend
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Restart Application**
   ```bash
   pm2 restart fojourn-travel-log
   ```

3. **Verify Application**
   ```bash
   # Check logs for errors
   pm2 logs fojourn-travel-log --lines 50
   
   # Test health endpoint
   curl http://localhost:3001/api/health
   ```

4. **Monitor for Issues**
   - Check PM2 logs for any new errors
   - Test key application features
   - Monitor for a few hours to ensure stability

### Rollback Plan (If Needed)

If you encounter issues after upgrading:

1. **Stop Application**
   ```bash
   pm2 stop fojourn-travel-log
   ```

2. **Restore from Backup**
   ```bash
   # Use management script option 10 > 4 (Restore from Backup)
   ./manage-server.sh
   ```

3. **Downgrade Node.js** (if necessary)
   ```bash
   # Install Node.js 14 (last version before optional chaining became common)
   curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

### Alternative: Downgrade express-rate-limit (Temporary Fix)

If you prefer not to upgrade Node.js immediately, you can downgrade the problematic package:

```bash
cd ~/fojourn.site/fojournapp/backend
npm install express-rate-limit@6.10.0
npm install
pm2 restart fojourn-travel-log
```

However, this is not recommended long-term as:
- You'll miss security updates
- Other packages may have similar issues
- You'll be locked to older package versions

### Expected Benefits After Upgrade

1. **Immediate Fixes**
   - Resolves the `express-rate-limit` syntax error
   - Eliminates Node.js deprecation warnings

2. **Long-term Benefits**
   - Access to modern packages and features
   - Better performance and memory usage
   - Enhanced security
   - Future-proofing your application

### Timeline Recommendation

**Immediate**: Use the management script to backup and upgrade Node.js
**Testing**: 1-2 hours to verify everything works
**Monitoring**: 24-48 hours to ensure stability

The upgrade is relatively low-risk since Node.js 18 LTS is very stable and your application uses standard features that are well-supported across versions.

### Need Help?

Use the management script's Node.js Management option (16) which provides:
- Compatibility checking
- Automated installation
- NPM management
- Cache clearing
- Global package listing

The script makes the upgrade process much safer and easier!