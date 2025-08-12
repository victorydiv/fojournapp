# PowerShell script to upload and fix line endings
# Run this from Windows to upload the deployment script with proper Unix line endings

param(
    [string]$RemoteHost = "victorydiv24@fojourn.site",
    [string]$RemotePath = "~/",
    [string]$ScriptName = "deploy-dreamhost-auto.sh"
)

Write-Host "DreamHost Deployment Script Uploader" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

# Check if the script exists
if (-not (Test-Path $ScriptName)) {
    Write-Host "ERROR: $ScriptName not found in current directory" -ForegroundColor Red
    exit 1
}

# Create a temporary file with Unix line endings
Write-Host "Converting line endings to Unix format..." -ForegroundColor Yellow
$content = Get-Content $ScriptName -Raw
$unixContent = $content -replace "`r`n", "`n" -replace "`r", "`n"
$tempFile = "$ScriptName.unix"
[System.IO.File]::WriteAllText($tempFile, $unixContent, [System.Text.Encoding]::UTF8)

Write-Host "Uploading $ScriptName to $RemoteHost..." -ForegroundColor Yellow

# Upload using SCP
try {
    & scp $tempFile "${RemoteHost}:${RemotePath}${ScriptName}"
    Write-Host "Upload successful!" -ForegroundColor Green
    
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "1. SSH into DreamHost: ssh $RemoteHost" -ForegroundColor White
    Write-Host "2. Run: chmod +x $ScriptName && ./$ScriptName" -ForegroundColor White
    
} catch {
    Write-Host "Upload failed: $_" -ForegroundColor Red
    Write-Host "`nAlternative: Use WinSCP or FileZilla to upload $tempFile as $ScriptName" -ForegroundColor Yellow
} finally {
    # Clean up temp file
    Remove-Item $tempFile -ErrorAction SilentlyContinue
}

Write-Host "`nScript ready for deployment!" -ForegroundColor Green
