#!/bin/bash

# Test script for the enhanced health check functionality
# This simulates PM2 issues and tests the recovery mechanisms

echo "🧪 Testing Enhanced Health Check Script"
echo "======================================="

# Set up test environment
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin:$PATH"
BACKEND_URL="http://127.0.0.1:3000"
LOG_FILE="$HOME/fojourn-health-test.log"
APP_DIR="$HOME/fojourn.site/fojournapp"

# Source the functions from the main health check script
source ./simple-health-check.sh

echo "1. Testing PM2 detection..."
PM2_CMD=$(find_pm2)
if [ $? -eq 0 ]; then
    echo "✅ PM2 found: $PM2_CMD"
else
    echo "❌ PM2 not found"
    exit 1
fi

echo ""
echo "2. Testing PM2 health check..."
if check_pm2_health "$PM2_CMD"; then
    echo "✅ PM2 health check passed"
else
    echo "⚠️ PM2 health check failed - this is expected if there are version issues"
    
    echo ""
    echo "3. Testing PM2 fix functionality..."
    if fix_pm2_issues "$PM2_CMD"; then
        echo "✅ PM2 fix completed successfully"
        
        echo ""
        echo "4. Re-testing PM2 health after fix..."
        if check_pm2_health "$PM2_CMD"; then
            echo "✅ PM2 health check passed after fix"
        else
            echo "❌ PM2 health check still failing after fix"
        fi
    else
        echo "❌ PM2 fix failed"
    fi
fi

echo ""
echo "5. Testing PM2 version detection..."
echo "PM2 version information:"
$PM2_CMD --version 2>&1 || echo "Version command failed"

echo ""
echo "6. Testing PM2 list command..."
echo "PM2 list output:"
$PM2_CMD list 2>&1 || echo "List command failed"

echo ""
echo "🏁 Test completed. Check the log file for detailed output:"
echo "   tail -f $LOG_FILE"
