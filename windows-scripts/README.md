# Simulation Server Management Scripts

These PowerShell scripts help manage the backend and frontend services for the Light of Life Club Simulation project.

## Scripts Overview

### Basic Server Management
- **start_backend.ps1**: Launches the FastAPI backend server on port 8000
- **start_frontend.ps1**: Launches the Vite development server on port 5173
- **stop_servers.ps1**: Gracefully stops both servers
- **setup_tasks.ps1**: Creates Windows Task Scheduler tasks for auto-start
- **manage_servers.ps1**: Master control script for all operations

### Windows Services (Recommended)
- **setup-nssm.ps1**: Downloads and installs NSSM (Non-Sucking Service Manager)
- **setup-services.ps1**: Creates Windows services for the backend, frontend, and Cloudflared tunnel

## Using the Scripts

All scripts now use relative paths based on the workspace location, so they can be run from any location as long as the project structure remains intact.

## Option 1: Basic Management with Task Scheduler

### Using the Management Script

The `manage_servers.ps1` script provides a convenient interface for controlling the servers:

```powershell
# From the windows-scripts directory
.\manage_servers.ps1 -Action start    # Start both servers
.\manage_servers.ps1 -Action stop     # Stop both servers
.\manage_servers.ps1 -Action restart  # Restart both servers
.\manage_servers.ps1 -Action status   # Check server status
.\manage_servers.ps1 -Action setup    # Set up auto-start tasks (requires admin)
```

### Setting Up Auto-Start with Task Scheduler

To set up auto-start for both servers on system boot:

1. Open PowerShell as Administrator
2. Navigate to the windows-scripts directory
3. Run: `.\manage_servers.ps1 -Action setup`

This will create Windows Task Scheduler tasks that start the servers automatically when you log in.

## Option 2: Running as Windows Services (Recommended)

Running as Windows services provides better reliability, auto-restart capabilities, and starts without requiring login.

### Setting Up Windows Services

1. First, install NSSM (Non-Sucking Service Manager):

```powershell
# Run as Administrator
.\setup-nssm.ps1
```

2. Then, create and configure the services:

```powershell
# Run as Administrator
.\setup-services.ps1 -Action install
```

3. Start the services:

```powershell
# Run as Administrator
.\setup-services.ps1 -Action start
```

### Managing Windows Services

```powershell
# Check service status (can run without admin)
.\setup-services.ps1 -Action status

# Start all services (requires admin)
.\setup-services.ps1 -Action start

# Stop all services (requires admin)
.\setup-services.ps1 -Action stop

# Restart all services (requires admin)
.\setup-services.ps1 -Action restart

# Remove all services (requires admin)
.\setup-services.ps1 -Action remove
```

### Logs

All logs are stored in the `logs` directory in the project root:
- `logs/backend_startup.log`
- `logs/frontend_startup.log`
- `logs/stop_servers.log`

## Customizing

If you need to modify the server configurations:
- Port changes can be made in the respective start scripts
- Environment variables can be added to the start scripts as needed
