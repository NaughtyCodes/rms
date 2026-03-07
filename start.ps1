# start.ps1
# This script manages backend/frontend services based on the provided parameter (start, stop, restart).

param (
    [Parameter(Position=0)]
    [string]$Action = "start"
)

Write-Host "ShopBill Pro Service Manager" -ForegroundColor Cyan
Write-Host "Action: $Action" -ForegroundColor DarkCyan

$backendRunning = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
$frontendRunning = Get-NetTCPConnection -LocalPort 4200 -ErrorAction SilentlyContinue

function Stop-Services {
    Write-Host "Stopping existing services..." -ForegroundColor Yellow
    if ($backendRunning) { 
        Stop-Process -Id $backendRunning.OwningProcess -Force -ErrorAction SilentlyContinue 
        Write-Host "✅ Backend stopped." -ForegroundColor Green
    } else {
        Write-Host "ℹ️ Backend is not running." -ForegroundColor DarkGray
    }
    
    if ($frontendRunning) { 
        Stop-Process -Id $frontendRunning.OwningProcess -Force -ErrorAction SilentlyContinue
        Write-Host "✅ Frontend stopped." -ForegroundColor Green
    } else {
        Write-Host "ℹ️ Frontend is not running." -ForegroundColor DarkGray
    }
}

function Start-Services {
    if ($backendRunning -or $frontendRunning) {
        Write-Host "WARNING: One or more services are already running! Use 'restart' to restart them." -ForegroundColor Yellow
        exit
    }
    Write-Host "Starting Backend Service..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd d:\rms\server; node src/app.js"
    
    Write-Host "Starting Frontend Service..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd d:\rms\client; npm start"
    
    Write-Host "Both services have been launched in separate windows!" -ForegroundColor Cyan
    Write-Host "The application will be available at http://localhost:4200" -ForegroundColor Cyan
}

switch ($Action.ToLower()) {
    "stop" {
        Stop-Services
    }
    "start" {
        Start-Services
    }
    "restart" {
        Stop-Services
        # Wait a brief moment to ensure ports are freed before restarting
        Start-Sleep -Seconds 2
        
        # Re-eval variables since we stopped processes
        $global:backendRunning = $null
        $global:frontendRunning = $null
        
        Start-Services
    }
    default {
        Write-Host "Invalid action specified. Please use 'start', 'stop', or 'restart'." -ForegroundColor Red
        Write-Host "Example: .\start.ps1 restart" -ForegroundColor Yellow
    }
}
