# Backend Startup Script
$ErrorActionPreference = "Stop"

# Log file for debugging
$logFile = "C:\Users\raykim\Documents\workspace\partnerclub\simulation\logs\backend_startup.log"

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
    Write-Log "Starting backend server..."
    
    # Change to the backend directory
    Set-Location -Path "C:\Users\raykim\Documents\workspace\partnerclub\simulation\src\backend"
    
    # Check if virtualenv exists and activate it if it does
    if (Test-Path "venv\Scripts\Activate.ps1" -PathType Leaf) {
        Write-Log "Activating virtual environment..."
        & .\venv\Scripts\Activate.ps1
    }

    # Use Python executable from the virtual environment
    $pythonExe = Join-Path -Path (Get-Location) -ChildPath "venv\Scripts\python.exe"
    if (!(Test-Path $pythonExe -PathType Leaf)) {
        Write-Log "Python executable not found in virtual environment at $pythonExe"
        exit 1
    }
    
    # Start the backend server
    Write-Log "Launching uvicorn server..."
    Start-Process -FilePath $pythonExe -ArgumentList "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload" -WindowStyle Normal -PassThru | Out-File -FilePath "$logFile.pid" -Encoding ascii
    
    Write-Log "Backend server started successfully"
} catch {
    Write-Log "Error starting backend server: $_"
    Write-Log "Stack trace: $($_.ScriptStackTrace)"
    exit 1
}
