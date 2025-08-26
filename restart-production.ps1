#!/usr/bin/env pwsh

Write-Host "🔄 Restarting Production Server..." -ForegroundColor Yellow

# SSH into the production server and restart the app
$sshCommand = @"
cd /home/victorydiv24/fojourn.site &&
echo "Pulling latest changes..." &&
git pull origin master &&
echo "Installing dependencies..." &&
npm install --production &&
echo "Restarting PM2 processes..." &&
pm2 restart all &&
pm2 status &&
echo "✅ Production server restarted successfully!"
"@

Write-Host "Connecting to production server..." -ForegroundColor Green
ssh victorydiv24@fojourn.site $sshCommand

Write-Host "🎉 Production restart complete!" -ForegroundColor Green
Write-Host "Testing health endpoint..." -ForegroundColor Blue

# Wait a moment for server to start
Start-Sleep -Seconds 3

# Test the health endpoint
try {
    $health = Invoke-RestMethod -Uri "https://fojourn.site/api/health" -Method GET
    Write-Host "✅ Server Status: $($health.status)" -ForegroundColor Green
    Write-Host "🚀 Uptime: $([math]::Round($health.uptime, 2)) seconds" -ForegroundColor Blue
    
    if ($health.fbMiddleware) {
        Write-Host "✅ Facebook middleware: $($health.fbMiddleware)" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
}

Write-Host "Testing Facebook bot middleware..." -ForegroundColor Blue
try {
    $response = Invoke-WebRequest -Uri "https://fojourn.site/u/sean.estes@kencogroup.com/memory/coral-sands-inn-51" -UserAgent "facebookexternalhit/1.1"
    if ($response.Content -like "*og:image*coral-sands*") {
        Write-Host "✅ Facebook middleware working!" -ForegroundColor Green
    } else {
        Write-Host "❌ Facebook middleware not working - still serving React app" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Facebook middleware test failed: $_" -ForegroundColor Red
}
