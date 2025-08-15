#!/bin/bash

# Fix double slash in URLs by checking and fixing FRONTEND_URL

echo "=== Checking FRONTEND_URL in production ==="

# Check current environment variable
echo "Current FRONTEND_URL: $FRONTEND_URL"

# Check .env file
echo "Checking .env file:"
if [[ -f ".env" ]]; then
    grep "FRONTEND_URL" .env || echo "FRONTEND_URL not found in .env"
else
    echo ".env file not found"
fi

# Check backend/.env file
echo "Checking backend/.env file:"
if [[ -f "backend/.env" ]]; then
    grep "FRONTEND_URL" backend/.env || echo "FRONTEND_URL not found in backend/.env"
else
    echo "backend/.env file not found"
fi

echo ""
echo "=== The fix ==="
echo "FRONTEND_URL should be: https://fojourn.site"
echo "NOT: https://fojourn.site/"
echo ""
echo "To fix, edit your production .env file and set:"
echo "FRONTEND_URL=https://fojourn.site"
echo ""
echo "Then restart PM2:"
echo "pm2 restart fojourn-travel-log"
