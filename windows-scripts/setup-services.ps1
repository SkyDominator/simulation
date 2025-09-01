# Setup Windows Services for Simulation Project
param (
    [Parameter(Mandatory=$false)]
    [ValidateSet("install", "remove", "start", "stop", "restart", "status")]
    [string]$Action = "install"
)

$ErrorActionPreference = "Stop"

# Find workspace root
$scriptPath = $PSScriptRoot
$workspaceRoot = Split-Path -Parent $scriptPath

# NSSM path
$nssmPath = Join-Path -Path $workspaceRoot -ChildPath "tools\nssm-2.24\win64\nssm.exe"
if (!(Test-Path $nssmPath)) {
    Write-Host "NSSM not found at $nssmPath. Please run setup-nssm.ps1 first." -ForegroundColor Red
    exit 1
}

# Service names
$backendServiceName = "SimulationBackend"
$frontendServiceName = "SimulationFrontend"
$cloudflaredServiceName = "SimulationCloudflared"

# Path to executables and scripts
$pythonPath = "python"
$nodePath = "npm"
$cloudflaredPath = "cloudflared"  # Assuming cloudflared is in PATH

# Working directories and arguments
$backendDir = Join-Path -Path $workspaceRoot -ChildPath "src\backend"
$frontendDir = Join-Path -Path $workspaceRoot -ChildPath "src\frontend"
$cloudflaredConfigPath = Join-Path -Path $workspaceRoot -ChildPath "cloudflared-config.yaml"

# Log files
$logsDir = Join-Path -Path $workspaceRoot -ChildPath "logs"
if (!(Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
}

# Create and activate virtual environment if it doesn't exist (for backend)
$venvPath = Join-Path -Path $backendDir -ChildPath "venv"
$venvActivatePath = Join-Path -Path $venvPath -ChildPath "Scripts\Activate.ps1"
$pythonVenvPath = Join-Path -Path $venvPath -ChildPath "Scripts\python.exe"

# Check if virtual environment exists
if (!(Test-Path $pythonVenvPath) -and $Action -eq "install") {
    Write-Host "Creating virtual environment for backend..." -ForegroundColor Cyan
    Set-Location -Path $backendDir
    & python -m venv venv
    if (Test-Path $venvActivatePath) {
        & $venvActivatePath
        & pip install -r requirements.txt
    } else {
        Write-Host "Failed to create virtual environment" -ForegroundColor Red
        exit 1
    }
}

function Install-Services {
    # Install Backend Service
    Write-Host "Installing Backend Service..." -ForegroundColor Cyan
    & $nssmPath install $backendServiceName $pythonVenvPath
    & $nssmPath set $backendServiceName AppParameters "-m uvicorn main:app --host 0.0.0.0 --port 8000"
    & $nssmPath set $backendServiceName AppDirectory $backendDir
    & $nssmPath set $backendServiceName DisplayName "Simulation Backend Service"
    & $nssmPath set $backendServiceName Description "FastAPI backend service for the Simulation project"
    & $nssmPath set $backendServiceName Start SERVICE_AUTO_START
    & $nssmPath set $backendServiceName AppStdout (Join-Path -Path $logsDir -ChildPath "backend_stdout.log")
    & $nssmPath set $backendServiceName AppStderr (Join-Path -Path $logsDir -ChildPath "backend_stderr.log")
    & $nssmPath set $backendServiceName AppRotateFiles 1
    & $nssmPath set $backendServiceName AppRotateBytes 10485760  # 10MB
    & $nssmPath set $backendServiceName AppRestartDelay 5000      # 5 seconds
    & $nssmPath set $backendServiceName DependOnService Tcpip
    
    # Install Frontend Service
    Write-Host "Installing Frontend Service..." -ForegroundColor Cyan
    & $nssmPath install $frontendServiceName $nodePath
    & $nssmPath set $frontendServiceName AppParameters "run dev -- --host 0.0.0.0 --port 5173"
    & $nssmPath set $frontendServiceName AppDirectory $frontendDir
    & $nssmPath set $frontendServiceName DisplayName "Simulation Frontend Service"
    & $nssmPath set $frontendServiceName Description "Vite dev server for the Simulation frontend"
    & $nssmPath set $frontendServiceName Start SERVICE_AUTO_START
    & $nssmPath set $frontendServiceName AppStdout (Join-Path -Path $logsDir -ChildPath "frontend_stdout.log")
    & $nssmPath set $frontendServiceName AppStderr (Join-Path -Path $logsDir -ChildPath "frontend_stderr.log")
    & $nssmPath set $frontendServiceName AppRotateFiles 1
    & $nssmPath set $frontendServiceName AppRotateBytes 10485760  # 10MB
    & $nssmPath set $frontendServiceName AppRestartDelay 5000      # 5 seconds
    & $nssmPath set $frontendServiceName DependOnService $backendServiceName
    
    # Install Cloudflared Service
    Write-Host "Installing Cloudflared Service..." -ForegroundColor Cyan
    & $nssmPath install $cloudflaredServiceName $cloudflaredPath
    & $nssmPath set $cloudflaredServiceName AppParameters "tunnel run --config $cloudflaredConfigPath"
    & $nssmPath set $cloudflaredServiceName AppDirectory $workspaceRoot
    & $nssmPath set $cloudflaredServiceName DisplayName "Simulation Cloudflared Tunnel"
    & $nssmPath set $cloudflaredServiceName Description "Cloudflare Tunnel for the Simulation project"
    & $nssmPath set $cloudflaredServiceName Start SERVICE_AUTO_START
    & $nssmPath set $cloudflaredServiceName AppStdout (Join-Path -Path $logsDir -ChildPath "cloudflared_stdout.log")
    & $nssmPath set $cloudflaredServiceName AppStderr (Join-Path -Path $logsDir -ChildPath "cloudflared_stderr.log")
    & $nssmPath set $cloudflaredServiceName AppRotateFiles 1
    & $nssmPath set $cloudflaredServiceName AppRotateBytes 10485760  # 10MB
    & $nssmPath set $cloudflaredServiceName AppRestartDelay 5000      # 5 seconds
    & $nssmPath set $cloudflaredServiceName DependOnService $frontendServiceName
    
    Write-Host "Services installed successfully. You can now start them with 'setup-services.ps1 -Action start'" -ForegroundColor Green
}

function Remove-Services {
    # Remove Cloudflared Service
    if (Get-Service -Name $cloudflaredServiceName -ErrorAction SilentlyContinue) {
        Write-Host "Removing Cloudflared Service..." -ForegroundColor Cyan
        & $nssmPath remove $cloudflaredServiceName confirm
    }
    
    # Remove Frontend Service
    if (Get-Service -Name $frontendServiceName -ErrorAction SilentlyContinue) {
        Write-Host "Removing Frontend Service..." -ForegroundColor Cyan
        & $nssmPath remove $frontendServiceName confirm
    }
    
    # Remove Backend Service
    if (Get-Service -Name $backendServiceName -ErrorAction SilentlyContinue) {
        Write-Host "Removing Backend Service..." -ForegroundColor Cyan
        & $nssmPath remove $backendServiceName confirm
    }
    
    Write-Host "Services removed successfully." -ForegroundColor Green
}

function Start-AllServices {
    Write-Host "Starting Backend Service..." -ForegroundColor Cyan
    Start-Service -Name $backendServiceName
    
    Write-Host "Waiting for backend to initialize..." -ForegroundColor Cyan
    Start-Sleep -Seconds 10
    
    Write-Host "Starting Frontend Service..." -ForegroundColor Cyan
    Start-Service -Name $frontendServiceName
    
    Write-Host "Waiting for frontend to initialize..." -ForegroundColor Cyan
    Start-Sleep -Seconds 10
    
    Write-Host "Starting Cloudflared Service..." -ForegroundColor Cyan
    Start-Service -Name $cloudflaredServiceName
    
    Write-Host "All services started." -ForegroundColor Green
}

function Stop-AllServices {
    Write-Host "Stopping Cloudflared Service..." -ForegroundColor Cyan
    Stop-Service -Name $cloudflaredServiceName -ErrorAction SilentlyContinue
    
    Write-Host "Stopping Frontend Service..." -ForegroundColor Cyan
    Stop-Service -Name $frontendServiceName -ErrorAction SilentlyContinue
    
    Write-Host "Stopping Backend Service..." -ForegroundColor Cyan
    Stop-Service -Name $backendServiceName -ErrorAction SilentlyContinue
    
    Write-Host "All services stopped." -ForegroundColor Green
}

function Get-ServiceStatus {
    $services = @($backendServiceName, $frontendServiceName, $cloudflaredServiceName)
    
    foreach ($service in $services) {
        $status = Get-Service -Name $service -ErrorAction SilentlyContinue
        
        if ($status) {
            Write-Host "$service Status: $($status.Status)" -ForegroundColor $(
                if ($status.Status -eq "Running") { "Green" } 
                elseif ($status.Status -eq "Stopped") { "Red" }
                else { "Yellow" }
            )
        } else {
            Write-Host "$service Status: Not Installed" -ForegroundColor Gray
        }
    }
}

# Check if running as administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin -and $Action -ne "status") {
    Write-Host "This script must be run as Administrator for all actions except 'status'." -ForegroundColor Red
    exit 1
}

# Execute requested action
switch ($Action) {
    "install" {
        Install-Services
    }
    "remove" {
        Stop-AllServices
        Remove-Services
    }
    "start" {
        Start-AllServices
    }
    "stop" {
        Stop-AllServices
    }
    "restart" {
        Stop-AllServices
        Start-Sleep -Seconds 5
        Start-AllServices
    }
    "status" {
        Get-ServiceStatus
    }
}
