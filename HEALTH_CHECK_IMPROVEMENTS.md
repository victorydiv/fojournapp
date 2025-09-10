# Health Check Script Improvements

## Overview
Enhanced the `simple-health-check.sh` script to automatically detect and fix PM2 version mismatches that were causing health monitoring failures.

## Problem Addressed
The original issue was that PM2 version mismatches (e.g., 6.0.10 vs 6.0.8) would cause the health check script to fail when trying to manage PM2 processes, requiring manual intervention.

## New Features Added

### 1. PM2 Health Checking (`check_pm2_health` function)
- Tests PM2 version command to detect version issues
- Tests PM2 list command to identify daemon connectivity problems
- Detects specific error patterns indicating version mismatches
- Provides detailed logging of detected issues

### 2. Automatic PM2 Fix (`fix_pm2_issues` function)
- **Daemon Reset**: Kills and restarts PM2 daemon to clear stale state
- **Version Update**: Updates PM2 to latest version if using global installation
- **Cleanup**: Removes corrupted PM2 files (logs, sockets, pid files)
- **Verification**: Tests that PM2 is working after fixes

### 3. Enhanced Restart Logic
- Checks PM2 health before attempting to use it
- Automatically fixes PM2 issues when detected
- Falls back gracefully to direct Node.js execution if PM2 can't be fixed
- Provides clear logging at each step

## Implementation Details

### PM2 Health Check Process
```bash
# Check version command
pm2 --version

# Check list command and parse errors
pm2 list 2>&1

# Look for specific error patterns:
# - "version" (version mismatch)
# - "daemon|connect" (daemon issues)
```

### PM2 Fix Process
```bash
# 1. Kill daemon
pm2 kill

# 2. Update PM2 (if global)
npm install -g pm2@latest

# 3. Clean directories
rm -rf ~/.pm2/logs/*
rm -f ~/.pm2/pm2.pid ~/.pm2/rpc.sock ~/.pm2/pub.sock

# 4. Restart daemon
pm2 ping

# 5. Verify health
check_pm2_health
```

### Fallback Strategy
If PM2 cannot be fixed:
1. Log the failure
2. Fall back to direct Node.js execution
3. Use `nohup node server.js &` as backup process manager
4. Continue monitoring with direct process approach

## Benefits

### Automatic Recovery
- No more manual intervention needed for PM2 version mismatches
- Health monitoring continues working even with PM2 issues
- Reduces downtime from version-related problems

### Better Diagnostics
- Detailed logging of PM2 issues and fix attempts
- Clear indication of which recovery method was used
- Easier troubleshooting with comprehensive logs

### Improved Reliability
- Multiple fallback strategies ensure service stays running
- Graceful degradation when PM2 isn't available
- Handles both version mismatches and daemon connectivity issues

## Testing

### Test Script
Created `test-health-check.sh` to validate the new functionality:
- Tests PM2 detection
- Verifies health checking logic
- Simulates fix procedures
- Validates recovery mechanisms

### Usage
```bash
# Run the test script
chmod +x test-health-check.sh
./test-health-check.sh

# Check detailed logs
tail -f ~/fojourn-health-test.log
```

## Deployment Notes

### Automatic Updates
The script will automatically update PM2 when version mismatches are detected, ensuring compatibility going forward.

### Permissions
Ensure the script has appropriate permissions:
```bash
chmod +x simple-health-check.sh
```

### Cron Configuration
The enhanced script works with existing cron configuration:
```bash
*/5 * * * * /path/to/simple-health-check.sh
```

### Log Monitoring
Monitor the health check logs for PM2 fix events:
```bash
tail -f ~/fojourn-health.log | grep "PM2\|version\|fix"
```

## Error Scenarios Handled

1. **PM2 Version Mismatch**: Automatic version update and daemon restart
2. **Daemon Connection Failure**: Clean daemon restart with socket cleanup
3. **Corrupted PM2 State**: Full cleanup and fresh daemon initialization
4. **PM2 Command Failures**: Fallback to direct Node.js execution
5. **Process Manager Unavailable**: Direct process management as backup

This enhancement ensures that health monitoring remains reliable even when PM2 encounters version-related issues, significantly reducing the need for manual intervention in production environments.
