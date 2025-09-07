#!/bin/bash

# Setup Hero Images Directories Script
# Run this on production server to create necessary directories for hero image functionality

echo "🖼️ Setting up hero images directories..."

# Create hero images directories
mkdir -p backend/uploads/hero-images
mkdir -p backend/public/hero-images

# Set proper permissions
chmod 755 backend/uploads/hero-images
chmod 755 backend/public/hero-images

echo "✅ Hero images directories created:"
echo "   - backend/uploads/hero-images (for processing)"
echo "   - backend/public/hero-images (for public serving)"

# Check if directories were created successfully
if [ -d "backend/uploads/hero-images" ] && [ -d "backend/public/hero-images" ]; then
    echo "✅ All hero image directories are ready!"
else
    echo "❌ Failed to create some directories. Please check permissions."
    exit 1
fi
