# Frontend Startup Script
$ErrorActionPreference = "Stop"

# Log file for debugging
$logFile = "C:\Users\raykim\Documents\workspace\partnerclub\simulation\logs\frontend_startup.log"

# Ensure log directory exists
if (!(Test-Path "C:\Users\raykim\Documents\workspace\partnerclub\simulation\logs")) {
    New-Item -ItemType Directory -Path "C:\Users\raykim\Documents\workspace\partnerclub\simulation\logs"
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
    Set-Location -Path "C:\Users\raykim\Documents\workspace\partnerclub\simulation\src\my-pwa-frontend"
    
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
    Write-Log "Launching Vite dev server..."
    Start-Process -FilePath "npm" -ArgumentList "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173" -WindowStyle Normal -PassThru | Out-File -FilePath "$logFile.pid" -Encoding ascii
    
    Write-Log "Frontend server started successfully"
} catch {
    Write-Log "Error starting frontend server: $_"
    Write-Log "Stack trace: $($_.ScriptStackTrace)"
    exit 1
}
