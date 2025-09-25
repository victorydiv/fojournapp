#!/bin/bash

# Frontend Deployment Fix Script
# This script addresses missing dependencies issues in production

echo "🚀 Starting frontend dependency fix deployment..."

# Navigate to project directory
cd /home/victorydiv24/fojourn.site/fojournapp

echo "📦 Pulling latest changes from repository..."
git pull origin master

echo "🔧 Installing/updating frontend dependencies..."
cd frontend

# Remove node_modules and package-lock.json to ensure clean install
echo "🧹 Cleaning previous installations..."
rm -rf node_modules
rm -f package-lock.json

echo "📥 Installing dependencies..."
npm install

# Verify that @dnd-kit packages are installed
echo "🔍 Verifying @dnd-kit packages installation..."
if [ -d "node_modules/@dnd-kit/core" ]; then
    echo "✅ @dnd-kit/core is installed"
else
    echo "❌ @dnd-kit/core is missing - installing explicitly..."
    npm install @dnd-kit/core@^6.3.1
fi

if [ -d "node_modules/@dnd-kit/sortable" ]; then
    echo "✅ @dnd-kit/sortable is installed"
else
    echo "❌ @dnd-kit/sortable is missing - installing explicitly..."
    npm install @dnd-kit/sortable@^10.0.0
fi

if [ -d "node_modules/@dnd-kit/utilities" ]; then
    echo "✅ @dnd-kit/utilities is installed"
else
    echo "❌ @dnd-kit/utilities is missing - installing explicitly..."
    npm install @dnd-kit/utilities@^3.2.2
fi

echo "🏗️ Building frontend..."
npm run build

echo "🔄 Restarting PM2 processes..."
cd ..
pm2 restart all

echo "✅ Frontend deployment fix completed!"
echo "🌐 Check your site at: https://fojourn.site"