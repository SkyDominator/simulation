# Simulation Server Management Scripts

These PowerShell scripts help manage the backend and frontend services for the Light of Life Club Simulation project.

## Scripts Overview

- **start_backend.ps1**: Launches the FastAPI backend server on port 8000
- **start_frontend.ps1**: Launches the Vite development server on port 5173
- **stop_servers.ps1**: Gracefully stops both servers
- **setup_tasks.ps1**: Creates Windows Task Scheduler tasks for auto-start
- **manage_servers.ps1**: Master control script for all operations

## Using the Scripts

All scripts now use relative paths based on the workspace location, so they can be run from any location as long as the project structure remains intact.

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

### Setting Up Auto-Start

To set up auto-start for both servers on system boot:

1. Open PowerShell as Administrator
2. Navigate to the windows-scripts directory
3. Run: `.\manage_servers.ps1 -Action setup`

This will create Windows Task Scheduler tasks that start the servers automatically when you log in.

### Logs

All logs are stored in the `logs` directory in the project root:
- `logs/backend_startup.log`
- `logs/frontend_startup.log`
- `logs/stop_servers.log`

## Customizing

If you need to modify the server configurations:
- Port changes can be made in the respective start scripts
- Environment variables can be added to the start scripts as needed
