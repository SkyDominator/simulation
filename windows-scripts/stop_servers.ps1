# Stop servers script
$ErrorActionPreference = "Stop"

# Find workspace root (parent of windows-scripts)
$workspaceRoot = Split-Path -Parent $PSScriptRoot

# Log file for debugging
$logFile = Join-Path -Path $workspaceRoot -ChildPath "logs\stop_servers.log"

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
    Write-Log "Stopping servers..."
    
    # Stop backend
    $backendPidFile = Join-Path -Path $workspaceRoot -ChildPath "logs\backend_startup.log.pid"
    if (Test-Path $backendPidFile) {
        $backendPid = Get-Content $backendPidFile
        Write-Log "Stopping backend process with PID: $backendPid"
        try {
            Stop-Process -Id $backendPid -ErrorAction SilentlyContinue
            Write-Log "Backend process stopped"
        } catch {
            Write-Log "Could not stop backend process: $_"
        }
    } else {
        Write-Log "No backend PID file found"
    }
    
    # Stop frontend
    $frontendPidFile = Join-Path -Path $workspaceRoot -ChildPath "logs\frontend_startup.log.pid"
    if (Test-Path $frontendPidFile) {
        $frontendPid = Get-Content $frontendPidFile
        Write-Log "Stopping frontend process with PID: $frontendPid"
        try {
            Stop-Process -Id $frontendPid -ErrorAction SilentlyContinue
            Write-Log "Frontend process stopped"
        } catch {
            Write-Log "Could not stop frontend process: $_"
        }
    } else {
        Write-Log "No frontend PID file found"
    }
    
    # Additionally, try to kill processes by port
    Write-Log "Attempting to kill processes by port..."
    
    # Kill process on port 8000 (backend)
    $processPort8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Where-Object State -eq Listen
    if ($processPort8000) {
        $processId = $processPort8000.OwningProcess
        Write-Log "Found process $processId using port 8000"
        try {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Write-Log "Successfully killed process on port 8000"
        } catch {
            Write-Log "Failed to kill process on port 8000: $_"
        }
    } else {
        Write-Log "No process found using port 8000"
    }
    
    # Kill process on port 4173 (frontend)
    $processPort4173 = Get-NetTCPConnection -LocalPort 4173 -ErrorAction SilentlyContinue | Where-Object State -eq Listen
    if ($processPort4173) {
        $processId = $processPort4173.OwningProcess
        Write-Log "Found process $processId using port 4173"
        try {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Write-Log "Successfully killed process on port 4173"
        } catch {
            Write-Log "Failed to kill process on port 4173: $_"
        }
    } else {
        Write-Log "No process found using port 4173"
    }
    
    Write-Log "Server stop complete"
} catch {
    Write-Log "Error stopping servers: $_"
    Write-Log "Stack trace: $($_.ScriptStackTrace)"
    exit 1
}
