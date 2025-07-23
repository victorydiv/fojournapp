@echo off
echo ====================================
echo    Travel Log App - Stop Script
echo ====================================
echo.

echo Stopping any running Node.js processes on ports 3000 and 3001...
echo.

set "killed=0"

REM Kill processes on port 3000 (Frontend)
echo Checking port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 2^>nul') do (
    if not "%%a"=="" (
        echo Stopping process %%a on port 3000...
        taskkill /f /pid %%a >nul 2>&1
        if not errorlevel 1 (
            echo Process %%a stopped successfully.
            set "killed=1"
        ) else (
            echo Failed to stop process %%a.
        )
    )
)

REM Kill processes on port 3001 (Backend)
echo Checking port 3001...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 2^>nul') do (
    if not "%%a"=="" (
        echo Stopping process %%a on port 3001...
        taskkill /f /pid %%a >nul 2>&1
        if not errorlevel 1 (
            echo Process %%a stopped successfully.
            set "killed=1"
        ) else (
            echo Failed to stop process %%a.
        )
    )
)

echo.
if "%killed%"=="1" (
    echo Travel Log App servers have been stopped.
) else (
    echo No Travel Log App processes were found running.
)
echo.
pause
