Write-Host "Starting Xiaozhi AI Music Service (MCP)..." -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan

# Check if Node.js is installed
Write-Host "Checking Node.js environment..." -ForegroundColor Yellow
try {
    $nodeVersion = node -v
    Write-Host "Node.js detected: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Node.js not found" -ForegroundColor Red
    Write-Host "Please install Node.js first: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "Press any key to continue..." -ForegroundColor Yellow
    $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null
    exit 1
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
try {
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed"
    }
    Write-Host "Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "Error: Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Create music library directory
Write-Host "Creating music library directory..." -ForegroundColor Yellow
if (-not (Test-Path -Path ".\library")) {
    New-Item -ItemType Directory -Path ".\library" -Force | Out-Null
    Write-Host "Music library directory created"
}

# Start the service
Write-Host "Starting service..." -ForegroundColor Yellow
Write-Host "Service address: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the service" -ForegroundColor Yellow

node main.js