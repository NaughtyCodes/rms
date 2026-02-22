# ShopBill Pro - Quick Start Guide

## The Easiest Way to Start (Windows Only)
You can start both the backend server and frontend client at the same time using the provided PowerShell script.

1. Open a PowerShell terminal in the `d:\AG\` folder.
2. Run the script:
   ```powershell
   .\start.ps1
   ```
3. If the servers are already running, the script will warn you and ask if you want to stop and restart them. Just type `Y` to restart, or `N` to cancel.

---

## Starting Manually

If you prefer to start the services individually, you will need two separate terminal windows.

### 1. Start the Backend Server
In your first terminal window:
```bash
cd d:\AG\server
node src/app.js
```

### 2. Start the Frontend Client
In your second terminal window:
```bash
cd d:\AG\client
npm start 
```

Once running, the application will be available in your browser at: **http://localhost:4200**

---

### Troubleshooting: "Address already in use" Error
If you try to start the backend manually and see an `EADDRINUSE :::3001` error, it means the server is already running in the background.

To fix this, you can either:
1. Use the `.\start.ps1` script (which handles this automatically).
2. Manually kill the process from PowerShell using:
   ```powershell
   Stop-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess -Force
   ```
# ag
