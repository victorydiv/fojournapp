@echo off
echo 🚀 Starting frontend dependency fix deployment...

echo 📦 Pulling latest changes from repository...
git pull origin master

echo 🔧 Installing/updating frontend dependencies...
cd frontend

echo 🧹 Cleaning previous installations...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo 📥 Installing dependencies...
npm install

echo 🔍 Verifying @dnd-kit packages installation...
npm list @dnd-kit/core
npm list @dnd-kit/sortable
npm list @dnd-kit/utilities

echo 🏗️ Building frontend...
npm run build

echo ✅ Frontend deployment fix completed!
cd ..
pause