# Production Deployment and Monitoring Setup Script (PowerShell)
# Run this on your production server to ensure proper PM2 configuration

param(
    [switch]$Force
)

$APP_NAME = "fojourn-travel-log"
$LOG_DIR = ".\logs"

Write-Host "🚀 Setting up Fojourn production deployment with enhanced monitoring..." -ForegroundColor Green

# Create logs directory if it doesn't exist
if (-not (Test-Path $LOG_DIR)) {
    New-Item -ItemType Directory -Path $LOG_DIR -Force
    Write-Host "✅ Created logs directory" -ForegroundColor Green
}

# Create log files if they don't exist
$logFiles = @("err.log", "out.log", "combined.log")
foreach ($logFile in $logFiles) {
    $logPath = Join-Path $LOG_DIR $logFile
    if (-not (Test-Path $logPath)) {
        New-Item -ItemType File -Path $logPath -Force
    }
}

# Check if PM2 is installed
try {
    pm2 --version | Out-Null
    Write-Host "✅ PM2 is already installed" -ForegroundColor Green
} catch {
    Write-Host "📦 Installing PM2..." -ForegroundColor Yellow
    npm install -g pm2
}

# Stop existing processes
Write-Host "🛑 Stopping existing PM2 processes..." -ForegroundColor Yellow
try {
    pm2 stop $APP_NAME 2>$null
    Write-Host "Stopped existing process" -ForegroundColor Gray
} catch {
    Write-Host "No existing process to stop" -ForegroundColor Gray
}

try {
    pm2 delete $APP_NAME 2>$null
    Write-Host "Deleted existing process" -ForegroundColor Gray
} catch {
    Write-Host "No existing process to delete" -ForegroundColor Gray
}

# Install backend dependencies
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
Set-Location backend
npm install --production
Set-Location ..

# Start the application with enhanced configuration
Write-Host "🚀 Starting application with PM2..." -ForegroundColor Green
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
Write-Host "⚙️ Setting up PM2 startup script..." -ForegroundColor Yellow
pm2 startup

Write-Host ""
Write-Host "⚠️  IMPORTANT: Copy and run the PM2 startup command shown above as Administrator" -ForegroundColor Red
Write-Host "   Then run: pm2 save" -ForegroundColor Red
Write-Host ""

# Setup log rotation
Write-Host "📋 Setting up log rotation..." -ForegroundColor Yellow
try {
    pm2 install pm2-logrotate
    pm2 set pm2-logrotate:retain 7
    pm2 set pm2-logrotate:compress true
    pm2 set pm2-logrotate:dateFormat 'YYYY-MM-DD_HH-mm-ss'
    pm2 set pm2-logrotate:max_size 10M
    Write-Host "✅ Log rotation configured" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not setup log rotation" -ForegroundColor Yellow
}

# Test the deployment
Write-Host "🧪 Testing deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check if the app is running
$pmStatus = pm2 jlist | ConvertFrom-Json
$app = $pmStatus | Where-Object { $_.name -eq $APP_NAME }

if ($app -and $app.pm2_env.status -eq "online") {
    Write-Host "✅ Application is running" -ForegroundColor Green
} else {
    Write-Host "❌ Application failed to start" -ForegroundColor Red
    pm2 logs $APP_NAME --lines 20
    exit 1
}

# Test health endpoint
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:3000/health" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Health endpoint is responding" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Health endpoint is not responding yet (may need more time)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Production deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Next steps:" -ForegroundColor Cyan
Write-Host "1. Run the PM2 startup command as Administrator (shown above)" -ForegroundColor White
Write-Host "2. Run: pm2 save" -ForegroundColor White
Write-Host "3. Setup Windows Task Scheduler for health monitoring" -ForegroundColor White
Write-Host "4. Test health monitoring manually" -ForegroundColor White
Write-Host ""
Write-Host "📋 Useful commands:" -ForegroundColor Cyan
Write-Host "  pm2 status              - Check application status" -ForegroundColor White
Write-Host "  pm2 logs $APP_NAME      - View application logs" -ForegroundColor White
Write-Host "  pm2 monit               - Real-time monitoring" -ForegroundColor White
Write-Host "  pm2 restart $APP_NAME   - Restart application" -ForegroundColor White
Write-Host ""
