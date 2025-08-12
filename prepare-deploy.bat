@echo off
setlocal EnableDelayedExpansion

echo.
echo ===============================================
echo    DreamHost Deployment Preparation
echo ===============================================
echo.

REM Check if we're in the right directory
if not exist package.json (
    echo ERROR: Not in project root directory. Please run this from the fojournapp directory.
    pause
    exit /b 1
)

echo [INFO] Creating production environment files...

REM Create backend .env.production
echo [INFO] Creating backend/.env.production template...
(
echo NODE_ENV=production
echo PORT=3000
echo FRONTEND_URL=https://fojourn.site
echo.
echo # Database Configuration - UPDATE THESE VALUES
echo DB_HOST=mysql.fojourn.site
echo DB_PORT=3306
echo DB_NAME=victorydiv24_travel_log
echo DB_USER=victorydiv24_dbuser
echo DB_PASSWORD=YOUR_DB_PASSWORD_HERE
echo.
echo # JWT Configuration - UPDATE THIS
echo JWT_SECRET=YOUR_SUPER_SECRET_JWT_KEY_HERE
echo.
echo # Google Maps API Key
echo GOOGLE_MAPS_API_KEY=AIzaSyDQMVK2ARUNIgwPA6x81HRafZAMEdVSV7E
echo.
echo # File Upload Configuration
echo MAX_FILE_SIZE=50000000
echo UPLOAD_PATH=/home/victorydiv24/fojourn.site/fojournapp/backend/uploads
) > backend\.env.production

REM Create frontend .env.production
echo [INFO] Creating frontend/.env.production...
(
echo REACT_APP_API_BASE_URL=https://fojourn.site/api
echo REACT_APP_PRODUCTION_API_URL=https://fojourn.site/api
echo REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyDQMVK2ARUNIgwPA6x81HRafZAMEdVSV7E
echo REACT_APP_GOOGLE_MAPS_MAP_ID=DEMO_MAP_ID
) > frontend\.env.production

REM Update frontend .env for building
echo [INFO] Updating frontend/.env for production build...
copy frontend\.env.production frontend\.env

REM Create .htaccess template
echo [INFO] Creating .htaccess template...
(
echo RewriteEngine On
echo.
echo # Handle API routes - proxy to PM2 process
echo RewriteRule ^^api/^(.*^)$ http://localhost:3000/api/$1 [P,L]
echo.
echo # Handle React app routes
echo RewriteCond %%{REQUEST_FILENAME} !-f
echo RewriteCond %%{REQUEST_FILENAME} !-d
echo RewriteRule ^^^(.*^)$ /index.html [L]
echo.
echo # Security headers
echo ^<IfModule mod_headers.c^>
echo Header always set X-Frame-Options DENY
echo Header always set X-Content-Type-Options nosniff
echo Header always set X-XSS-Protection "1; mode=block"
echo Header always set Referrer-Policy "strict-origin-when-cross-origin"
echo ^</IfModule^>
echo.
echo # Caching for static assets
echo ^<IfModule mod_expires.c^>
echo ExpiresActive on
echo ExpiresByType text/css "access plus 1 year"
echo ExpiresByType application/javascript "access plus 1 year"
echo ExpiresByType image/png "access plus 1 year"
echo ExpiresByType image/jpeg "access plus 1 year"
echo ExpiresByType image/gif "access plus 1 year"
echo ExpiresByType image/svg+xml "access plus 1 year"
echo ^</IfModule^>
) > .htaccess.template

echo.
echo [INFO] Installing dependencies locally to verify...

REM Install backend dependencies
echo [INFO] Installing backend dependencies...
cd backend
call npm install
if errorlevel 1 (
    echo ERROR: Backend npm install failed
    pause
    exit /b 1
)
cd ..

REM Install frontend dependencies
echo [INFO] Installing frontend dependencies...
cd frontend
call npm install
if errorlevel 1 (
    echo ERROR: Frontend npm install failed
    pause
    exit /b 1
)
cd ..

REM Build frontend
echo.
echo [INFO] Building frontend...
cd frontend
call npm run build
if errorlevel 1 (
    echo ERROR: Frontend build failed
    pause
    exit /b 1
)
cd ..

echo.
echo ===============================================
echo            PREPARATION COMPLETE!
echo ===============================================
echo.
echo ✅ Production environment files created
echo ✅ Dependencies installed and tested
echo ✅ Frontend built successfully
echo.
echo NEXT STEPS:
echo.
echo 1. Update database credentials in backend/.env.production
echo 2. Update JWT secret in backend/.env.production
echo 3. Upload files to DreamHost ~/fojourn.site/fojournapp/
echo 4. SSH into DreamHost and run: chmod +x quick-deploy.sh ^&^& ./quick-deploy.sh
echo.
echo FILES TO UPLOAD:
echo - All project files (except node_modules)
echo - Use backend/.env.production as backend/.env on server
echo - Use frontend/.env.production as frontend/.env on server  
echo - Use .htaccess.template as .htaccess in web root
echo.
echo Ready for deployment!
echo.
pause
