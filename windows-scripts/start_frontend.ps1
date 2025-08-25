# Frontend Startup Script
$ErrorActionPreference = "Stop"

# Find workspace root (parent of windows-scripts)
$workspaceRoot = Split-Path -Parent $PSScriptRoot

# Log file for debugging
$logFile = Join-Path -Path $workspaceRoot -ChildPath "logs\frontend_startup.log"

# Ensure log directory exists
$logDir = Join-Path -Path $workspaceRoot -ChildPath "logs"
if (!(Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir
}

# Function to log messages
function Write-Log {
    param (
        [string]$Message
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Out-File -FilePath $logFile -Append
}

try {
    Write-Log "Starting frontend server..."
    
    # Change to the frontend directory
    $frontendPath = Join-Path -Path $workspaceRoot -ChildPath "src\my-pwa-frontend"
    Set-Location -Path $frontendPath
    
    # Check if Node.js is in PATH
    $nodePath = Get-Command npm -ErrorAction SilentlyContinue
    if ($null -eq $nodePath) {
        Write-Log "Node/npm not found in PATH. Please make sure Node.js is installed."
        exit 1
    }
    
    # Install dependencies if needed (uncomment if needed)
    # Write-Log "Installing dependencies..."
    # & npm install
    
    # Start the frontend server
    Write-Log "Launching Vite preview server..."
    Start-Process -FilePath "npm" -ArgumentList "run", "preview" -WindowStyle Normal -PassThru | Out-File -FilePath "$logFile.pid" -Encoding ascii
    
    Write-Log "Frontend server started successfully"
} catch {
    Write-Log "Error starting frontend server: $_"
    Write-Log "Stack trace: $($_.ScriptStackTrace)"
    exit 1
}
