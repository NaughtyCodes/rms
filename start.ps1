# start.ps1
# This script stops any running instances of the backend/frontend if confirmed, and then starts both of them.

Write-Host "Starting ShopBill Pro..." -ForegroundColor Cyan

# 1. Check for existing node instances holding port 3001 (Backend) or 4200 (Frontend)
$backendRunning = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
$frontendRunning = Get-NetTCPConnection -LocalPort 4200 -ErrorAction SilentlyContinue

if ($backendRunning -or $frontendRunning) {
    Write-Host "WARNING: One or more services are already running!" -ForegroundColor Yellow
    
    if ($backendRunning) { Write-Host "- Backend (Port 3001) is running." -ForegroundColor Yellow }
    if ($frontendRunning) { Write-Host "- Frontend (Port 4200) is running." -ForegroundColor Yellow }
    
    $userInput = Read-Host "Do you want to stop the existing services and restart them? (y/n)"
    
    if ($userInput -eq 'y' -or $userInput -eq 'Y') {
        Write-Host "Stopping existing services..." -ForegroundColor Yellow
        if ($backendRunning) { Stop-Process -Id $backendRunning.OwningProcess -Force -ErrorAction SilentlyContinue }
        if ($frontendRunning) { Stop-Process -Id $frontendRunning.OwningProcess -Force -ErrorAction SilentlyContinue }
        Write-Host "Services stopped." -ForegroundColor Green
    }
    else {
        Write-Host "Exiting without making changes." -ForegroundColor Red
        exit
    }
}

# 2. Start Backend
Write-Host "Starting Backend Service..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd d:\AG\server; node src/app.js"

# 3. Start Frontend
Write-Host "Starting Frontend Service..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd d:\AG\client; npm start"

Write-Host "Both services have been launched in separate windows!" -ForegroundColor Cyan
Write-Host "The application will be available at http://localhost:4200" -ForegroundColor Cyan
