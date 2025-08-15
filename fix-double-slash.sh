#!/bin/bash

# Comprehensive diagnosis of image loading issues

echo "=== FRONTEND_URL Issue ==="
echo "Current FRONTEND_URL: $FRONTEND_URL"
if [[ -f "backend/.env" ]]; then
    echo "In backend/.env:"
    grep "FRONTEND_URL" backend/.env || echo "FRONTEND_URL not found"
fi

echo ""
echo "=== Upload Directory Analysis ==="
echo "Upload directory contents:"
ls -la backend/uploads/ | head -10

echo ""
echo "Total files in uploads:"
ls -1 backend/uploads/ | wc -l

echo ""
echo "=== Database vs File System Check ==="
echo "Checking if image files exist..."

# Check specific files mentioned in error
TEST_FILES=("files-1755265212490-818705835.jpg" "files-1755263592580-11791185.jpg")

for file in "${TEST_FILES[@]}"; do
    if [[ -f "backend/uploads/$file" ]]; then
        echo "✓ EXISTS: $file"
        ls -la "backend/uploads/$file"
    else
        echo "✗ MISSING: $file"
    fi
done

echo ""
echo "=== Recent uploads ==="
echo "Most recent 5 files in uploads:"
ls -lt backend/uploads/ | head -6

echo ""
echo "=== Fixes ==="
echo "1. Fix FRONTEND_URL (remove trailing slash):"
echo "   Change: FRONTEND_URL=https://fojourn.site/"
echo "   To: FRONTEND_URL=https://fojourn.site"
echo ""
echo "2. Then restart PM2:"
echo "   pm2 restart fojourn-travel-log"
