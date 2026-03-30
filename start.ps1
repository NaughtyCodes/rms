# start.ps1
# This script manages backend/frontend services based on the provided parameter (start, stop, restart).

param (
    [Parameter(Position=0)]
    [string]$Action = "start"
)

Write-Host "Tractly Service Manager" -ForegroundColor Cyan
Write-Host "Action: $Action" -ForegroundColor DarkCyan

$backendRunning = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
$frontendRunning = Get-NetTCPConnection -LocalPort 4200 -ErrorAction SilentlyContinue
$cloudflaredRunning = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue

function Stop-Services {
    param([switch]$Live)
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
    
    if ($Live) {
        Write-Host "Stopping Cloudflare Tunnel..." -ForegroundColor Yellow
        if ($cloudflaredRunning) {
            Stop-Process -Name "cloudflared" -Force -ErrorAction SilentlyContinue
            Write-Host "✅ Cloudflare Tunnel stopped." -ForegroundColor Green
        } else {
            Write-Host "ℹ️ Cloudflare Tunnel is not running." -ForegroundColor DarkGray
        }
    }
}

function Start-Services {
    param([switch]$Live)
    if ($backendRunning -or $frontendRunning) {
        Write-Host "WARNING: One or more services are already running! Use 'restart' to restart them." -ForegroundColor Yellow
        exit
    }
    Write-Host "Starting Backend Service..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $PSScriptRoot\server; node src/app.js"
    
    Write-Host "Starting Frontend Service..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $PSScriptRoot\client; npm start"
    
    Write-Host "Both services have been launched in separate windows!" -ForegroundColor Cyan
    Write-Host "The application will be available at http://localhost:4200" -ForegroundColor Cyan

    if ($Live) {
        Write-Host "Waiting for services to initialize before starting Cloudflare Tunnel..." -ForegroundColor Cyan
        Start-Sleep -Seconds 5
        Write-Host "Starting Cloudflare Tunnel..." -ForegroundColor Green
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cloudflared tunnel run tractly-live"
    }
}

switch ($Action.ToLower()) {
    "stop" {
        Stop-Services
    }
    "stop-live" {
        Stop-Services -Live
    }
    "start" {
        Start-Services
    }
    "start-live" {
        Start-Services -Live
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
    "restart-live" {
        Stop-Services -Live
        Start-Sleep -Seconds 2
        
        $global:backendRunning = $null
        $global:frontendRunning = $null
        $global:cloudflaredRunning = $null
        
        Start-Services -Live
    }
    default {
        Write-Host "Invalid action specified. Please use 'start', 'stop', 'restart', 'start-live', 'stop-live', or 'restart-live'." -ForegroundColor Red
        Write-Host "Example: .\start.ps1 restart-live" -ForegroundColor Yellow
    }
}
