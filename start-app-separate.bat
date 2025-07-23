@echo off
echo ====================================
echo   Travel Log App - Separate Windows
echo ====================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

REM Navigate to project root
cd /d "%~dp0"
echo Current directory: %CD%
echo.

REM Check if backend dependencies are installed
if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install backend dependencies
        pause
        exit /b 1
    )
    cd ..
)

REM Check if frontend dependencies are installed
if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install frontend dependencies
        pause
        exit /b 1
    )
    cd ..
)

echo.
echo ====================================
echo   Checking for Port Conflicts...
echo ====================================
echo.

REM Kill any processes using port 3000 (Frontend)
echo Checking port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 2^>nul') do (
    if not "%%a"=="" (
        echo Killing process %%a on port 3000...
        taskkill /f /pid %%a >nul 2>&1
    )
)

REM Kill any processes using port 3001 (Backend)
echo Checking port 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 2^>nul') do (
    if not "%%a"=="" (
        echo Killing process %%a on port 3001...
        taskkill /f /pid %%a >nul 2>&1
    )
)

echo Ports cleared successfully.
echo.

echo Starting Backend Server in new window...
start "Travel Log Backend" cmd /k "cd /d %CD%\backend && npm run dev"

echo Waiting 3 seconds before starting frontend...
timeout /t 3 /nobreak >nul

echo Starting Frontend Server in new window...
start "Travel Log Frontend" cmd /k "cd /d %CD%\frontend && npm start"

echo.
echo ====================================
echo     Both servers are starting...
echo ====================================
echo.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Close the terminal windows to stop the servers
echo.
pause
