# PowerShell script to fix the user_merges table issue in production
# Run this from the project root directory

Write-Host "🚀 Applying fix for user_merges table issue..." -ForegroundColor Green

# Build the frontend
Write-Host "📦 Building frontend..." -ForegroundColor Yellow
Set-Location frontend
npm run build
Set-Location ..

# Copy files to production
Write-Host "📋 Deploying updated files..." -ForegroundColor Yellow

# Deploy the fix (you might need to adjust the deployment method based on your setup)
Write-Host "⚡ The following files have been updated and need to be deployed:" -ForegroundColor Cyan
Write-Host "- backend/routes/auth.js (fixed table name from user_merges to account_merges)" -ForegroundColor White
Write-Host "- database/fix-user-merges-table.sql (database verification script)" -ForegroundColor White

Write-Host "🗄️ Database fix needed:" -ForegroundColor Yellow
Write-Host "The auth.js code was corrected to use 'account_merges' table instead of 'user_merges'" -ForegroundColor White
Write-Host "Run this SQL in production if needed:" -ForegroundColor White
Write-Host "mysql -u victorydiv24 -p victorydiv24_travel_log2 < database/fix-user-merges-table.sql" -ForegroundColor Gray

Write-Host "📊 Summary of changes:" -ForegroundColor Green
Write-Host "✅ Fixed auth.js to query correct table name (account_merges)" -ForegroundColor White
Write-Host "✅ Fixed column names (user1_id, user2_id instead of primary_user_id, secondary_user_id)" -ForegroundColor White
Write-Host "✅ Created database verification script" -ForegroundColor White

Write-Host "🎯 Next steps:" -ForegroundColor Cyan
Write-Host "1. Deploy the updated backend/routes/auth.js file" -ForegroundColor White
Write-Host "2. Restart the PM2 process" -ForegroundColor White
Write-Host "3. Monitor logs to verify the error is resolved" -ForegroundColor White

Write-Host "✅ Fix preparation complete!" -ForegroundColor Green