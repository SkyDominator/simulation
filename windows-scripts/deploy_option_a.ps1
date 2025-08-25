# Option A Deployment Script - PWA Application on Windows with Cloudflare Tunnel
# -------------------------------------------------------------------------
# This script sets up both frontend and backend services for your PWA app
# and uses Cloudflare Tunnel for secure HTTPS access.
#
# Prerequisites:
# 1. Node.js and npm installed
# 2. Python 3.11+ and pip installed
# 3. Cloudflare account with Cloudflare Tunnel set up
# 4. Git installed and repo cloned

# Configuration - MODIFY THESE VALUES
# -------------------------------------------------------------------------
$CLOUDFLARE_DOMAIN = "partnersclub.example.com" # Replace with your actual domain
$SUPABASE_URL = "https://kihlqhomsychihwzwzuo.supabase.co" # Your Supabase URL
$SUPABASE_PUBLISHABLE_KEY = "" # Your Supabase publishable key
$SUPABASE_SECRET_KEY = "" # Your Supabase secret key
$FRONTEND_PORT = 4173 # Vite preview port
$BACKEND_PORT = 8000 # FastAPI port

# Paths
$REPO_ROOT = $PSScriptRoot # Current directory of this script
$FRONTEND_DIR = Join-Path -Path $REPO_ROOT -ChildPath "src\my-pwa-frontend"
$BACKEND_DIR = Join-Path -Path $REPO_ROOT -ChildPath "src\backend"

# Functions
# -------------------------------------------------------------------------

function Ensure-EnvFile {
    param (
        [string]$Directory,
        [hashtable]$EnvVars
    )
    
    $envPath = Join-Path -Path $Directory -ChildPath ".env"
    $content = ""
    
    foreach ($key in $EnvVars.Keys) {
        $content += "$key=$($EnvVars[$key])`n"
    }
    
    Set-Content -Path $envPath -Value $content
    Write-Host "Created .env file at $envPath" -ForegroundColor Green
}

function Check-Prerequisites {
    $checks = @(
        @{ Name = "Node.js"; Cmd = "node --version" },
        @{ Name = "npm"; Cmd = "npm --version" },
        @{ Name = "Python"; Cmd = "python --version" },
        @{ Name = "pip"; Cmd = "pip --version" },
        @{ Name = "Git"; Cmd = "git --version" },
        @{ Name = "Cloudflared"; Cmd = "cloudflared --version" }
    )
    
    $allPassed = $true
    foreach ($check in $checks) {
        try {
            $output = Invoke-Expression $check.Cmd 2>&1
            Write-Host "✓ $($check.Name) is installed: $output" -ForegroundColor Green
        }
        catch {
            Write-Host "✗ $($check.Name) is not installed or not in PATH" -ForegroundColor Red
            if ($check.Name -eq "Cloudflared") {
                Write-Host "  Install cloudflared from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation" -ForegroundColor Yellow
            }
            $allPassed = $false
        }
    }
    
    return $allPassed
}

function Setup-Frontend {
    Write-Host "Setting up frontend..." -ForegroundColor Cyan
    Set-Location $FRONTEND_DIR
    
    # Create .env file for frontend
    $frontendEnv = @{
        "VITE_SUPABASE_URL" = $SUPABASE_URL
        "VITE_SUPABASE_PUBLISHABLE_KEY" = $SUPABASE_PUBLISHABLE_KEY
        "VITE_API_BASE_URL" = "https://$CLOUDFLARE_DOMAIN/api"
    }
    Ensure-EnvFile -Directory $FRONTEND_DIR -EnvVars $frontendEnv
    
    # Install dependencies and build
    npm ci
    npm run build
    
    Write-Host "Frontend built successfully. Ready to serve with 'npm run preview'" -ForegroundColor Green
}

function Setup-Backend {
    Write-Host "Setting up backend..." -ForegroundColor Cyan
    Set-Location $BACKEND_DIR
    
    # Create .env file for backend
    $backendEnv = @{
        "SUPABASE_URL" = $SUPABASE_URL
        "SUPABASE_SECRET_KEY" = $SUPABASE_SECRET_KEY
    }
    Ensure-EnvFile -Directory $BACKEND_DIR -EnvVars $backendEnv
    
    # Create Python virtual environment if it doesn't exist
    if (-not (Test-Path (Join-Path -Path $BACKEND_DIR -ChildPath "venv"))) {
        Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
        python -m venv venv
    }
    
    # Activate virtual environment and install dependencies
    & "$BACKEND_DIR\venv\Scripts\Activate.ps1"
    pip install -r requirements.txt
    
    Write-Host "Backend setup completed" -ForegroundColor Green
}

function Generate-CloudflareConfig {
    $configPath = Join-Path -Path $REPO_ROOT -ChildPath "cloudflared-config.yaml"
    
    $config = @"
tunnel: your-tunnel-id # Replace with your tunnel ID from Cloudflare dashboard
credentials-file: C:\path\to\your\credentials\file.json # Replace with your credentials file path
ingress:
  - hostname: $CLOUDFLARE_DOMAIN
    path: /api/
    service: http://localhost:$BACKEND_PORT
  - hostname: $CLOUDFLARE_DOMAIN
    service: http://localhost:$FRONTEND_PORT
  - service: http_status:404
"@
    
    Set-Content -Path $configPath -Value $config
    Write-Host "Generated Cloudflare Tunnel config at $configPath" -ForegroundColor Green
    Write-Host "IMPORTANT: You need to update the tunnel ID and credentials file path!" -ForegroundColor Yellow
}

function Start-Services {
    # Create scheduled tasks to start services on boot
    $frontendTaskName = "SimulationPWA_Frontend"
    $backendTaskName = "SimulationPWA_Backend"
    $cloudflareTaskName = "SimulationPWA_Cloudflared"
    
    # Frontend preview task
    $frontendAction = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument "-NoProfile -ExecutionPolicy Bypass -Command `"Set-Location '$FRONTEND_DIR'; npm run preview`"" `
        -WorkingDirectory $FRONTEND_DIR
    $frontendTrigger = New-ScheduledTaskTrigger -AtStartup
    $frontendSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
    
    Register-ScheduledTask -TaskName $frontendTaskName -Action $frontendAction -Trigger $frontendTrigger -Settings $frontendSettings -Force
    
    # Backend service task
    $backendAction = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument "-NoProfile -ExecutionPolicy Bypass -Command `"Set-Location '$BACKEND_DIR'; & .\venv\Scripts\Activate.ps1; python -m uvicorn main:app --host 0.0.0.0 --port $BACKEND_PORT`"" `
        -WorkingDirectory $BACKEND_DIR
    $backendTrigger = New-ScheduledTaskTrigger -AtStartup
    $backendSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
    
    Register-ScheduledTask -TaskName $backendTaskName -Action $backendAction -Trigger $backendTrigger -Settings $backendSettings -Force
    
    # Cloudflare tunnel task
    $cloudflareConfigPath = Join-Path -Path $REPO_ROOT -ChildPath "cloudflared-config.yaml"
    $cloudflareAction = New-ScheduledTaskAction -Execute "cloudflared.exe" `
        -Argument "tunnel run --config $cloudflareConfigPath" `
        -WorkingDirectory $REPO_ROOT
    $cloudflareTrigger = New-ScheduledTaskTrigger -AtStartup
    $cloudflareSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
    
    Register-ScheduledTask -TaskName $cloudflareTaskName -Action $cloudflareAction -Trigger $cloudflareTrigger -Settings $cloudflareSettings -Force
    
    Write-Host "Created scheduled tasks for frontend, backend, and Cloudflare Tunnel" -ForegroundColor Green
    Write-Host "You can start them manually from Task Scheduler or reboot your PC" -ForegroundColor Yellow
}

function Setup-AutoUpdate {
    # Create auto-update script
    $updateScriptPath = Join-Path -Path $REPO_ROOT -ChildPath "auto_update.ps1"
    $updateScript = @"
# Auto-update script for PWA app
Set-Location $REPO_ROOT

# Pull latest changes
git fetch origin
$currentBranch = git rev-parse --abbrev-ref HEAD
$localCommit = git rev-parse HEAD
$remoteCommit = git rev-parse origin/$currentBranch

if ($localCommit -ne $remoteCommit) {
    # Changes detected, rebuild and restart
    Write-Host "Updates detected, pulling changes..."
    git pull origin $currentBranch

    # Update frontend
    Set-Location $FRONTEND_DIR
    npm ci
    npm run build

    # Restart services
    Restart-ScheduledTask -TaskName "SimulationPWA_Frontend"
    Restart-ScheduledTask -TaskName "SimulationPWA_Backend"
}
else {
    Write-Host "No updates available"
}
"@
    
    Set-Content -Path $updateScriptPath -Value $updateScript
    
    # Create scheduled task for auto-update
    $updateTaskName = "SimulationPWA_AutoUpdate"
    $updateAction = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$updateScriptPath`"" `
        -WorkingDirectory $REPO_ROOT
    
    # Run every 15 minutes
    $updateTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 15)
    $updateSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    
    Register-ScheduledTask -TaskName $updateTaskName -Action $updateAction -Trigger $updateTrigger -Settings $updateSettings -Force
    
    Write-Host "Setup auto-update scheduled task (runs every 15 minutes)" -ForegroundColor Green
}

# Main execution
# -------------------------------------------------------------------------
Write-Host "Starting PWA Deployment (Option A - Cloudflare Tunnel)" -ForegroundColor Magenta

# Check prerequisites
$prereqOk = Check-Prerequisites
if (-not $prereqOk) {
    Write-Host "Please install missing prerequisites before continuing" -ForegroundColor Red
    exit 1
}

# Pull latest changes
Set-Location $REPO_ROOT
git pull origin main

# Setup frontend and backend
Setup-Frontend
Setup-Backend

# Generate Cloudflare Tunnel config
Generate-CloudflareConfig

# Create scheduled tasks
Start-Services

# Setup auto-update
Setup-AutoUpdate

# Final instructions
Write-Host @"
===============================================================
DEPLOYMENT COMPLETE! NEXT STEPS:
===============================================================
1. Edit cloudflared-config.yaml with your Tunnel ID and credential path
2. Open Task Scheduler and start the tasks:
   - SimulationPWA_Frontend
   - SimulationPWA_Backend
   - SimulationPWA_Cloudflared

Your PWA app will be available at: https://$CLOUDFLARE_DOMAIN
Auto-updates will run every 15 minutes.

To test installation:
- Android: Open Chrome → Visit the URL → Tap 'Install App' from menu
- iOS: Open Safari → Visit the URL → Share → Add to Home Screen
===============================================================
"@ -ForegroundColor Cyan

# Return to starting directory
Set-Location $REPO_ROOT
