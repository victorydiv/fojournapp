@echo off
echo ===================================
echo Local Build and Deploy Script
echo ===================================

REM Colors for Windows batch
set GREEN=[92m
set YELLOW=[93m
set BLUE=[94m
set NC=[0m

echo %BLUE%=== Building Frontend Locally ===%NC%
cd frontend

echo %GREEN%Installing frontend dependencies...%NC%
call npm install

echo %GREEN%Building production frontend...%NC%
set GENERATE_SOURCEMAP=false
call npm run build

if %ERRORLEVEL% neq 0 (
    echo %YELLOW%Frontend build failed!%NC%
    pause
    exit /b 1
)

cd ..

echo %BLUE%=== Deploying to Production ===%NC%
echo %GREEN%Pushing changes to git...%NC%
git add .
git commit -m "Local build deployment - %date% %time%" 2>nul
git push origin master

echo %GREEN%Deployment commands to run on production server:%NC%
echo.
echo %YELLOW%SSH into your DreamHost server and run:%NC%
echo cd ~/fojourn.site/fojournapp
echo git pull origin master
echo ./deploy-backend-only.sh
echo.
echo %GREEN%Build completed successfully!%NC%
echo Frontend build is in: frontend/build/
pause
