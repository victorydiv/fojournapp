@echo off
echo Uploading PM2 recovery scripts to server...

echo.
echo Uploading quick-pm2-fix.sh...
scp quick-pm2-fix.sh victorydiv24@victorydiv24.com:~/

echo.
echo Uploading robust-health-check.sh...
scp robust-health-check.sh victorydiv24@victorydiv24.com:~/

echo.
echo Uploading pm2-recovery.sh...
scp pm2-recovery.sh victorydiv24@victorydiv24.com:~/

echo.
echo Making scripts executable on server...
ssh victorydiv24@victorydiv24.com "chmod +x ~/quick-pm2-fix.sh ~/robust-health-check.sh ~/pm2-recovery.sh"

echo.
echo ✅ Scripts uploaded successfully!
echo.
echo To fix the EPIPE error, run on your server:
echo   ./quick-pm2-fix.sh
echo.
echo For future monitoring, use:
echo   ./robust-health-check.sh
echo.
pause
