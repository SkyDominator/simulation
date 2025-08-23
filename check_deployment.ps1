# Check Deployment Status Script for Partners Club Simulation PWA
# This script checks the status of all components needed for the PWA deployment

param(
    [string]$ConfigPath = ".\cloudflared-config.yaml"
)

function Write-ColorOutput {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message,
        [Parameter(Mandatory = $true)]
        [string]$Color
    )
    $currentForeground = $Host.UI.RawUI.ForegroundColor
    $Host.UI.RawUI.ForegroundColor = $Color
    Write-Output $Message
    $Host.UI.RawUI.ForegroundColor = $currentForeground
}

function Test-TCPConnection {
    param(
        [string]$ComputerName,
        [int]$Port
    )
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $asyncResult = $tcpClient.BeginConnect($ComputerName, $Port, $null, $null)
        $wait = $asyncResult.AsyncWaitHandle.WaitOne(1000, $false)
        if ($wait) {
            try {
                $tcpClient.EndConnect($asyncResult)
                return $true
            } catch {
                return $false
            }
        } else {
            return $false
        }
        $tcpClient.Close()
    } catch {
        return $false
    }
}

function Test-ServiceStatus {
    param(
        [string]$ServiceName,
        [string]$DisplayName
    )
    
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    
    if ($service) {
        if ($service.Status -eq 'Running') {
            Write-ColorOutput "$DisplayName service is running" "Green"
            return $true
        } else {
            Write-ColorOutput "$DisplayName service is not running (Status: $($service.Status))" "Yellow"
            return $false
        }
    } else {
        Write-ColorOutput "$DisplayName service not found" "Red"
        return $false
    }
}

function Test-ScheduledTaskStatus {
    param(
        [string]$TaskName,
        [string]$DisplayName
    )
    
    $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    
    if ($task) {
        if ($task.State -eq 'Running' -or $task.State -eq 'Ready') {
            Write-ColorOutput "$DisplayName task is configured ($($task.State))" "Green"
            return $true
        } else {
            Write-ColorOutput "$DisplayName task is not running properly (Status: $($task.State))" "Yellow"
            return $false
        }
    } else {
        Write-ColorOutput "$DisplayName scheduled task not found" "Red"
        return $false
    }
}

function Test-ProcessStatus {
    param(
        [string]$ProcessName,
        [string]$DisplayName
    )
    
    $process = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
    
    if ($process) {
        Write-ColorOutput "$DisplayName process is running (PID: $($process.Id))" "Green"
        return $true
    } else {
        Write-ColorOutput "$DisplayName process not found" "Red"
        return $false
    }
}

function Test-PortStatus {
    param(
        [string]$HostName,
        [int]$Port,
        [string]$ServiceName
    )
    
    $result = Test-TCPConnection -ComputerName $HostName -Port $Port
    
    if ($result) {
        Write-ColorOutput "$ServiceName is listening on port $Port" "Green"
        return $true
    } else {
        Write-ColorOutput "$ServiceName is NOT listening on port $Port" "Red"
        return $false
    }
}

function Test-CloudflaredConfig {
    param(
        [string]$ConfigPath
    )
    
    if (Test-Path $ConfigPath) {
        try {
            $configContent = Get-Content $ConfigPath -Raw
            Write-ColorOutput "Cloudflare Tunnel config found at $ConfigPath" "Green"
            
            # Try to extract tunnel ID and hostnames
            if ($configContent -match 'tunnel:\s*([a-zA-Z0-9-]+)') {
                $tunnelId = $Matches[1]
                Write-ColorOutput "Tunnel ID: $tunnelId" "White"
            }
            
            if ($configContent -match 'hostname:\s*([a-zA-Z0-9.-]+)') {
                $hostname = $Matches[1]
                Write-ColorOutput "Hostname configured: $hostname" "White"
                
                # Try to ping the hostname
                try {
                    $pingResult = Test-Connection -ComputerName $hostname -Count 1 -ErrorAction SilentlyContinue
                    if ($pingResult) {
                        Write-ColorOutput "Hostname $hostname is reachable" "Green"
                    } else {
                        Write-ColorOutput "Hostname $hostname is not reachable" "Yellow"
                        Write-ColorOutput "This is normal if using Cloudflare proxy (gray cloud)" "Yellow"
                    }
                } catch {
                    Write-ColorOutput "Cannot ping hostname $hostname" "Yellow"
                    Write-ColorOutput "This is normal if using Cloudflare proxy (gray cloud)" "Yellow"
                }
                
                # Try to access the website
                try {
                    $webRequest = Invoke-WebRequest -Uri "https://$hostname" -UseBasicParsing -TimeoutSec 10 -ErrorAction SilentlyContinue
                    if ($webRequest.StatusCode -eq 200) {
                        Write-ColorOutput "Website at https://$hostname is accessible (Status: $($webRequest.StatusCode))" "Green"
                    } else {
                        Write-ColorOutput "Website at https://$hostname returned status code: $($webRequest.StatusCode)" "Yellow"
                    }
                } catch {
                    Write-ColorOutput "Cannot access website at https://$hostname" "Red"
                    Write-ColorOutput "Error: $($_.Exception.Message)" "Red"
                }
                
                # Try to access the API
                try {
                    $apiRequest = Invoke-WebRequest -Uri "https://$hostname/api/health" -UseBasicParsing -TimeoutSec 10 -ErrorAction SilentlyContinue
                    if ($apiRequest.StatusCode -eq 200) {
                        Write-ColorOutput "API at https://$hostname/api/health is accessible (Status: $($apiRequest.StatusCode))" "Green"
                    } else {
                        Write-ColorOutput "API at https://$hostname/api/health returned status code: $($apiRequest.StatusCode)" "Yellow"
                    }
                } catch {
                    Write-ColorOutput "Cannot access API at https://$hostname/api/health" "Red"
                    Write-ColorOutput "Error: $($_.Exception.Message)" "Red"
                }
            }
            
            return $true
        } catch {
            Write-ColorOutput "Error reading Cloudflare config: $($_.Exception.Message)" "Red"
            return $false
        }
    } else {
        Write-ColorOutput "Cloudflare Tunnel config not found at $ConfigPath" "Red"
        return $false
    }
}

# Main script execution
Write-ColorOutput "`n===== Partners Club Simulation PWA Deployment Status =====`n" "Cyan"

# Check if cloudflared is installed
$cloudflaredPath = Get-Command cloudflared -ErrorAction SilentlyContinue
if ($cloudflaredPath) {
    Write-ColorOutput "Cloudflared is installed at: $($cloudflaredPath.Source)" "Green"
    $cloudflaredVersion = & cloudflared --version
    Write-ColorOutput "Cloudflared version: $cloudflaredVersion" "White"
} else {
    Write-ColorOutput "Cloudflared is NOT installed" "Red"
    Write-ColorOutput "Please install cloudflared from: https://github.com/cloudflare/cloudflared/releases" "Yellow"
}

# Check Cloudflared configuration
Test-CloudflaredConfig -ConfigPath $ConfigPath

# Check if cloudflared service is running
Test-ServiceStatus -ServiceName "cloudflared" -DisplayName "Cloudflare Tunnel"

# Check cloudflared as a process
Test-ProcessStatus -ProcessName "cloudflared" -DisplayName "Cloudflare Tunnel"

# Check backend service/task
Test-ScheduledTaskStatus -TaskName "PartnerClubBackend" -DisplayName "Partners Club Backend"
Test-PortStatus -HostName "localhost" -Port 8000 -ServiceName "FastAPI Backend"

# Check frontend service/task
Test-ScheduledTaskStatus -TaskName "PartnerClubFrontend" -DisplayName "Partners Club Frontend"
Test-PortStatus -HostName "localhost" -Port 4173 -ServiceName "Frontend (Vite preview)"

# Check Docker status if using Docker
$dockerService = Get-Service -Name "docker" -ErrorAction SilentlyContinue
if ($dockerService) {
    if ($dockerService.Status -eq 'Running') {
        Write-ColorOutput "Docker service is running" "Green"
        # Check docker containers
        try {
            $containers = & docker ps --format "{{.Names}}" 2>$null
            if ($containers) {
                Write-ColorOutput "Docker containers running:" "Green"
                $containers | ForEach-Object {
                    Write-ColorOutput "  - $_" "White"
                }
            } else {
                Write-ColorOutput "No Docker containers are running" "Yellow"
            }
        } catch {
            Write-ColorOutput "Error checking Docker containers" "Red"
        }
    } else {
        Write-ColorOutput "Docker service is not running" "Yellow"
    }
} else {
    Write-ColorOutput "Docker service not found (this is normal if not using Docker for deployment)" "White"
}

# Environment variables check
Write-ColorOutput "`n===== Environment Variables Check =====`n" "Cyan"

$envVars = @(
    @{Name="SUPABASE_URL"; IsSecret=$false},
    @{Name="SUPABASE_PUBLISHABLE_KEY"; IsSecret=$true},
    @{Name="SUPABASE_SECRET_KEY"; IsSecret=$true},
    @{Name="JWT_SECRET"; IsSecret=$true}
)

foreach ($var in $envVars) {
    $value = [Environment]::GetEnvironmentVariable($var.Name, "Machine")
    if ($value) {
        if ($var.IsSecret) {
            $maskedValue = $value.Substring(0, [Math]::Min(4, $value.Length)) + "..." + $value.Substring([Math]::Max(0, $value.Length - 4))
            Write-ColorOutput "$($var.Name) is set (value: $maskedValue)" "Green"
        } else {
            Write-ColorOutput "$($var.Name) is set (value: $value)" "Green"
        }
    } else {
        Write-ColorOutput "$($var.Name) is NOT set" "Red"
    }
}

Write-ColorOutput "`n===== Deployment Status Summary =====`n" "Cyan"
Write-ColorOutput "If all components show as running and ports are accessible, your PWA deployment should be operational." "White"
Write-ColorOutput "To fix any issues:" "White"
Write-ColorOutput "1. Check the deploy_option_a.ps1 log file for errors" "White"
Write-ColorOutput "2. Verify Cloudflare Tunnel is correctly configured" "White"
Write-ColorOutput "3. Ensure all environment variables are properly set" "White"
Write-ColorOutput "4. Restart any failing services or tasks" "White"
