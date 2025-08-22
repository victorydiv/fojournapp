#!/bin/bash

# Clean up duplicate health monitoring cron jobs
# This script removes all existing health monitoring cron jobs and sets up a single one

echo "🧹 Cleaning up health monitoring cron jobs..."

# Remove any existing health monitoring cron jobs
crontab -l 2>/dev/null | grep -v "health-monitor\|simple-health-check" | crontab -

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Add the single health monitoring cron job
echo "✅ Adding single health monitoring cron job..."
(crontab -l 2>/dev/null; echo "*/5 * * * * /bin/bash $SCRIPT_DIR/simple-health-check.sh") | crontab -

echo "📅 Current cron jobs:"
crontab -l

echo ""
echo "✅ Health monitoring cleanup complete!"
echo "🔍 Only one health check job should be listed above"
