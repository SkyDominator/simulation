# Setting Up Cloudflare Tunnel for Your PWA App

This guide walks through setting up a Cloudflare Tunnel to give your PWA app a secure HTTPS URL without opening firewall ports on your Windows PC.

## Prerequisites

1. A Cloudflare account (free tier works fine)
2. A domain name connected to Cloudflare DNS
3. Windows PC running your frontend and backend servers

## Step 1: Install Cloudflared CLI

1. Download the latest cloudflared release from: [cloudflared releases](https://github.com/cloudflare/cloudflared/releases)
   - For Windows, download `cloudflared-windows-amd64.msi`
2. Run the installer and follow the prompts to complete installation
3. Verify the installation by opening PowerShell and running:

   ```powershell
   cloudflared --version
   ```

## Step 2: Authenticate with Cloudflare

1. Login to your Cloudflare account:
   ```powershell
   cloudflared tunnel login
   ```
2. Your browser will open. Select the domain you want to use for your tunnel
3. After authorization, a certificate file is saved to your user's `.cloudflared` directory

## Step 3: Create a Tunnel

1. Create a new tunnel:
   ```powershell
   cloudflared tunnel create simulation-pwa
   ```
2. Note the Tunnel ID in the output (you'll need it for the configuration)
3. The credentials file is automatically created in the `.cloudflared` directory

## Step 4: Configure DNS for Your Tunnel

1. Create a DNS record that points your subdomain to the tunnel:
   ```powershell
   cloudflared tunnel route dns simulation-pwa partnersclub.yourdomain.com
   ```
   Replace `partnersclub.yourdomain.com` with your actual subdomain.

## Step 5: Configure Your Tunnel

1. Create a configuration file (`cloudflared-config.yaml`):

   ```yaml
   tunnel: your-tunnel-id-here
   credentials-file: C:\Users\YOUR_USERNAME\.cloudflared\your-tunnel-id-here.json
   ingress:
     - hostname: partnersclub.yourdomain.com
       path: /api/
       service: http://localhost:8000
     - hostname: partnersclub.yourdomain.com
       service: http://localhost:4173
     - service: http_status:404
   ```

   Replace:

   - `your-tunnel-id-here` with the Tunnel ID from Step 3
   - `YOUR_USERNAME` with your Windows username
   - `partnersclub.yourdomain.com` with your actual subdomain

2. Save this file in your project root directory

## Step 6: Start the Tunnel

1. Run the tunnel with your configuration:

   ```powershell
   cloudflared tunnel --config cloudflared-config.yaml run
   ```

2. Keep this terminal window open to maintain the tunnel connection, or use the scheduled task in the deployment script

## Step 7: Verify Your Setup

1. Ensure your backend API is running on port 8000
2. Ensure your frontend is running on port 4173 (Vite preview)
3. Open a browser and navigate to `https://partnersclub.yourdomain.com`
4. Test the API endpoint at `https://partnersclub.yourdomain.com/api/`

## Step 8: Set Environment Variables

1. Update your frontend build with the correct API URL:

   ```
   VITE_API_BASE_URL=https://partnersclub.yourdomain.com/api
   ```

2. Make sure your backend CORS settings include your domain:
   ```python
   # In src/backend/config/settings.py
   cors_origins = ["https://partnersclub.yourdomain.com", ...]
   ```

## Running as a Service

The deployment script creates scheduled tasks to run the tunnel, frontend, and backend servers on startup. You can also:

1. Run cloudflared as a Windows service:

   ```powershell
   cloudflared service install --config cloudflared-config.yaml
   ```

2. Start the service:
   ```powershell
   Start-Service cloudflared
   ```

## Troubleshooting

1. **Certificate errors**: Run `cloudflared tunnel login` again to refresh certificates
2. **Connection refused**: Check that your local services are running (backend on 8000, frontend on 4173)
3. **CORS issues**: Ensure your backend CORS settings include your Cloudflare domain
4. **Tunnel crashes**: Check the cloudflared logs in Event Viewer > Application
