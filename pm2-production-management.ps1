# PM2 Production Management for Fojourn Travel Log (Windows PowerShell Version)
# This script helps manage your backend in production with automatic restarts

param(
    [string]$Command
)

function Show-Status {
    Write-Host "📊 Current PM2 Status:" -ForegroundColor Cyan
    pm2 status
    Write-Host ""
    pm2 info fojourn-travel-log
}

function Start-App {
    Write-Host "🚀 Starting Fojourn Travel Log with PM2..." -ForegroundColor Green
    pm2 start ecosystem.config.js --env production
    pm2 save
    Write-Host "✅ Application started and configuration saved" -ForegroundColor Green
}

function Restart-App {
    Write-Host "🔄 Restarting Fojourn Travel Log..." -ForegroundColor Yellow
    pm2 restart fojourn-travel-log
    Write-Host "✅ Application restarted" -ForegroundColor Green
}

function Stop-App {
    Write-Host "⏹️ Stopping Fojourn Travel Log..." -ForegroundColor Red
    pm2 stop fojourn-travel-log
    Write-Host "✅ Application stopped" -ForegroundColor Green
}

function Remove-App {
    Write-Host "🗑️ Removing Fojourn Travel Log from PM2..." -ForegroundColor Red
    pm2 delete fojourn-travel-log
    pm2 save
    Write-Host "✅ Application removed from PM2" -ForegroundColor Green
}

function Show-Logs {
    Write-Host "📋 Viewing logs for Fojourn Travel Log..." -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to exit log view" -ForegroundColor Yellow
    pm2 logs fojourn-travel-log --lines 50
}

function Show-ErrorLogs {
    Write-Host "❌ Viewing error logs for Fojourn Travel Log..." -ForegroundColor Red
    pm2 logs fojourn-travel-log --err --lines 50
}

function Start-Monitor {
    Write-Host "📈 Opening PM2 monitoring dashboard..." -ForegroundColor Cyan
    pm2 monit
}

function Setup-Startup {
    Write-Host "⚙️ Setting up PM2 to start automatically on server boot..." -ForegroundColor Cyan
    pm2 startup
    Write-Host ""
    Write-Host "⚠️ IMPORTANT: Copy and run the command shown above as Administrator" -ForegroundColor Yellow
    Write-Host "Then run: pm2 save" -ForegroundColor Yellow
}

function Clear-Logs {
    Write-Host "🧹 Flushing PM2 logs..." -ForegroundColor Cyan
    pm2 flush
    Write-Host "✅ Logs flushed" -ForegroundColor Green
}

function Show-Commands {
    Write-Host "📊 PM2 Monitoring Commands:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Check status:           pm2 status" -ForegroundColor White
    Write-Host "View logs:              pm2 logs fojourn-travel-log" -ForegroundColor White
    Write-Host "View error logs:        pm2 logs fojourn-travel-log --err" -ForegroundColor White
    Write-Host "Monitor resources:      pm2 monit" -ForegroundColor White
    Write-Host "Restart app:            pm2 restart fojourn-travel-log" -ForegroundColor White
    Write-Host "Reload with zero downtime: pm2 reload fojourn-travel-log" -ForegroundColor White
    Write-Host "Stop app:               pm2 stop fojourn-travel-log" -ForegroundColor White
    Write-Host "Delete app:             pm2 delete fojourn-travel-log" -ForegroundColor White
    Write-Host ""
    Write-Host "📈 Useful monitoring:" -ForegroundColor Cyan
    Write-Host "Show app info:          pm2 info fojourn-travel-log" -ForegroundColor White
    Write-Host "Show process list:      pm2 list" -ForegroundColor White
    Write-Host "Flush logs:             pm2 flush" -ForegroundColor White
    Write-Host "Reset restart counter:  pm2 reset fojourn-travel-log" -ForegroundColor White
}

function Show-Help {
    Write-Host "Usage: .\pm2-production-management.ps1 -Command <command>" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Yellow
    Write-Host "  start    - Start the application with PM2" -ForegroundColor White
    Write-Host "  restart  - Restart the application" -ForegroundColor White
    Write-Host "  stop     - Stop the application" -ForegroundColor White
    Write-Host "  delete   - Remove application from PM2" -ForegroundColor White
    Write-Host "  status   - Show current PM2 status" -ForegroundColor White
    Write-Host "  logs     - View application logs" -ForegroundColor White
    Write-Host "  errors   - View error logs only" -ForegroundColor White
    Write-Host "  monitor  - Open PM2 monitoring dashboard" -ForegroundColor White
    Write-Host "  startup  - Setup PM2 to start on server boot" -ForegroundColor White
    Write-Host "  flush    - Clear all logs" -ForegroundColor White
    Write-Host "  commands - Show all PM2 monitoring commands" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\pm2-production-management.ps1 -Command start" -ForegroundColor Green
    Write-Host "  .\pm2-production-management.ps1 -Command status" -ForegroundColor Green
    Write-Host "  .\pm2-production-management.ps1 -Command logs" -ForegroundColor Green
}

# Main switch
switch ($Command.ToLower()) {
    "start" { Start-App }
    "restart" { Restart-App }
    "stop" { Stop-App }
    "delete" { Remove-App }
    "status" { Show-Status }
    "logs" { Show-Logs }
    "errors" { Show-ErrorLogs }
    "monitor" { Start-Monitor }
    "startup" { Setup-Startup }
    "flush" { Clear-Logs }
    "commands" { Show-Commands }
    default { Show-Help }
}
