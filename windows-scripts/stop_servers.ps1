# Stop servers script
$ErrorActionPreference = "Stop"

# Log file for debugging
$logFile = "C:\Users\raykim\Documents\workspace\partnerclub\simulation\logs\stop_servers.log"

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
    Write-Log "Stopping servers..."
    
    # Stop backend
    $backendPidFile = "C:\Users\raykim\Documents\workspace\partnerclub\simulation\logs\backend_startup.log.pid"
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
    $frontendPidFile = "C:\Users\raykim\Documents\workspace\partnerclub\simulation\logs\frontend_startup.log.pid"
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
    
    # Kill process on port 5173 (frontend)
    $processPort5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Where-Object State -eq Listen
    if ($processPort5173) {
        $processId = $processPort5173.OwningProcess
        Write-Log "Found process $processId using port 5173"
        try {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Write-Log "Successfully killed process on port 5173"
        } catch {
            Write-Log "Failed to kill process on port 5173: $_"
        }
    } else {
        Write-Log "No process found using port 5173"
    }
    
    Write-Log "Server stop complete"
} catch {
    Write-Log "Error stopping servers: $_"
    Write-Log "Stack trace: $($_.ScriptStackTrace)"
    exit 1
}
