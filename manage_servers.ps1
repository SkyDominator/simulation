# Simulation Server Manager
param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("start", "stop", "restart", "status", "setup")]
    [string]$Action
)

$ErrorActionPreference = "Stop"
$scriptPath = $PSScriptRoot

function Get-ProcessByPort {
    param (
        [int]$Port
    )
    
    try {
        $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object State -eq Listen
        if ($connection) {
            $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
            return $process
        }
    } catch {
        return $null
    }
    return $null
}

switch ($Action) {
    "start" {
        Write-Host "Starting simulation servers..." -ForegroundColor Cyan
        
        # Start backend
        Write-Host "Starting backend server..." -ForegroundColor Green
        Start-Process -FilePath "powershell.exe" -ArgumentList "-ExecutionPolicy Bypass -File `"$scriptPath\start_backend.ps1`"" -NoNewWindow
        
        # Give the backend some time to start
        Start-Sleep -Seconds 5
        
        # Start frontend
        Write-Host "Starting frontend server..." -ForegroundColor Green
        Start-Process -FilePath "powershell.exe" -ArgumentList "-ExecutionPolicy Bypass -File `"$scriptPath\start_frontend.ps1`"" -NoNewWindow
        
        Write-Host "Servers are starting. Check the logs in the logs directory for details." -ForegroundColor Cyan
    }
    
    "stop" {
        Write-Host "Stopping simulation servers..." -ForegroundColor Cyan
        & "$scriptPath\stop_servers.ps1"
        Write-Host "Servers stopped." -ForegroundColor Cyan
    }
    
    "restart" {
        Write-Host "Restarting simulation servers..." -ForegroundColor Cyan
        
        # Stop servers
        & "$scriptPath\stop_servers.ps1"
        
        # Give processes time to fully terminate
        Start-Sleep -Seconds 5
        
        # Start servers
        Write-Host "Starting backend server..." -ForegroundColor Green
        Start-Process -FilePath "powershell.exe" -ArgumentList "-ExecutionPolicy Bypass -File `"$scriptPath\start_backend.ps1`"" -NoNewWindow
        
        # Give the backend some time to start
        Start-Sleep -Seconds 5
        
        # Start frontend
        Write-Host "Starting frontend server..." -ForegroundColor Green
        Start-Process -FilePath "powershell.exe" -ArgumentList "-ExecutionPolicy Bypass -File `"$scriptPath\start_frontend.ps1`"" -NoNewWindow
        
        Write-Host "Servers restarted. Check the logs in the logs directory for details." -ForegroundColor Cyan
    }
    
    "status" {
        Write-Host "Checking server status..." -ForegroundColor Cyan
        
        # Check backend (port 8000)
        $backendProcess = Get-ProcessByPort -Port 8000
        if ($backendProcess) {
            Write-Host "Backend server is RUNNING" -ForegroundColor Green
            Write-Host "  Process ID: $($backendProcess.Id)" -ForegroundColor Gray
            Write-Host "  Process Name: $($backendProcess.ProcessName)" -ForegroundColor Gray
            Write-Host "  Started: $($backendProcess.StartTime)" -ForegroundColor Gray
        } else {
            Write-Host "Backend server is NOT RUNNING" -ForegroundColor Red
        }
        
        # Check frontend (port 5173)
        $frontendProcess = Get-ProcessByPort -Port 5173
        if ($frontendProcess) {
            Write-Host "Frontend server is RUNNING" -ForegroundColor Green
            Write-Host "  Process ID: $($frontendProcess.Id)" -ForegroundColor Gray
            Write-Host "  Process Name: $($frontendProcess.ProcessName)" -ForegroundColor Gray
            Write-Host "  Started: $($frontendProcess.StartTime)" -ForegroundColor Gray
        } else {
            Write-Host "Frontend server is NOT RUNNING" -ForegroundColor Red
        }
    }
    
    "setup" {
        Write-Host "Setting up auto-start tasks..." -ForegroundColor Cyan
        
        # Check if running as admin
        $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
        $isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
        
        if (-not $isAdmin) {
            Write-Host "This operation requires administrative privileges." -ForegroundColor Red
            Write-Host "Please right-click on PowerShell and select 'Run as Administrator', then run this command again." -ForegroundColor Yellow
            exit 1
        }
        
        # Run setup script
        & "$scriptPath\setup_tasks.ps1"
        
        Write-Host "Setup complete. Servers will start automatically at logon." -ForegroundColor Green
    }
}
