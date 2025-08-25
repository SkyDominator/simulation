# Download and Install NSSM
$ErrorActionPreference = "Stop"

# Find workspace root
$scriptPath = $PSScriptRoot
$workspaceRoot = Split-Path -Parent $scriptPath

# Create tools directory if it doesn't exist
$toolsDir = Join-Path -Path $workspaceRoot -ChildPath "tools"
if (!(Test-Path $toolsDir)) {
    New-Item -ItemType Directory -Path $toolsDir | Out-Null
}

# Define NSSM paths
$nssmZipPath = Join-Path -Path $toolsDir -ChildPath "nssm-2.24.zip"
$nssmExtractPath = Join-Path -Path $toolsDir -ChildPath "nssm-2.24"
$nssmExePath = Join-Path -Path $nssmExtractPath -ChildPath "win64\nssm.exe"

# Check if NSSM is already downloaded and extracted
if (!(Test-Path $nssmExePath)) {
    # Download NSSM
    Write-Host "Downloading NSSM..." -ForegroundColor Cyan
    $nssmUrl = "https://nssm.cc/release/nssm-2.24.zip"
    
    try {
        Invoke-WebRequest -Uri $nssmUrl -OutFile $nssmZipPath
    } catch {
        Write-Host "Failed to download NSSM. Please download it manually from https://nssm.cc/release/nssm-2.24.zip" -ForegroundColor Red
        Write-Host "Extract it to $toolsDir\nssm-2.24" -ForegroundColor Red
        exit 1
    }
    
    # Extract NSSM
    Write-Host "Extracting NSSM..." -ForegroundColor Cyan
    Expand-Archive -Path $nssmZipPath -DestinationPath $toolsDir -Force
}

# Verify NSSM exists
if (!(Test-Path $nssmExePath)) {
    Write-Host "NSSM executable not found at $nssmExePath." -ForegroundColor Red
    Write-Host "Please download it manually from https://nssm.cc/release/nssm-2.24.zip" -ForegroundColor Red
    Write-Host "Extract it to $toolsDir\nssm-2.24" -ForegroundColor Red
    exit 1
}

Write-Host "NSSM is ready at: $nssmExePath" -ForegroundColor Green
Write-Host "You can now use this path in the setup-services.ps1 script."
