# Setup Task Scheduler script
$ErrorActionPreference = "Stop"

# Get current directory
$scriptPath = $PSScriptRoot

# Backend script path
$backendScriptPath = Join-Path -Path $scriptPath -ChildPath "start_backend.ps1"

# Frontend script path
$frontendScriptPath = Join-Path -Path $scriptPath -ChildPath "start_frontend.ps1"

# Create the backend task
$backendAction = New-ScheduledTaskAction `
    -Execute "PowerShell.exe" `
    -Argument "-ExecutionPolicy Bypass -File `"$backendScriptPath`""

$backendTrigger = New-ScheduledTaskTrigger -AtLogOn

$backendSettings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1)

# Register the backend task
Register-ScheduledTask `
    -TaskName "SimulationBackendStarter" `
    -Action $backendAction `
    -Trigger $backendTrigger `
    -Settings $backendSettings `
    -Description "Starts the Simulation backend server at logon and restarts it if it fails" `
    -Force

# Create the frontend task
$frontendAction = New-ScheduledTaskAction `
    -Execute "PowerShell.exe" `
    -Argument "-ExecutionPolicy Bypass -File `"$frontendScriptPath`""

$frontendTrigger = New-ScheduledTaskTrigger -AtLogOn

$frontendSettings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1)

# Register the frontend task
Register-ScheduledTask `
    -TaskName "SimulationFrontendStarter" `
    -Action $frontendAction `
    -Trigger $frontendTrigger `
    -Settings $frontendSettings `
    -Description "Starts the Simulation frontend server at logon and restarts it if it fails" `
    -Force

Write-Output "Tasks created successfully. The backend and frontend servers will start automatically at logon."
Write-Output "You can also run the tasks manually from Task Scheduler."
