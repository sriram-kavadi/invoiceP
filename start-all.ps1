# Launch InvoiceHub (Database + Backend API + Frontend Client)
$ErrorActionPreference = "Stop"

$env:PATH = "C:\Program Files\nodejs;d:\invoiceP\pgsql\bin;$env:PATH"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       Starting InvoiceHub Platform     " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Start Database
Write-Host "`n[1/3] Starting PostgreSQL..." -ForegroundColor Yellow
if (Test-Path "d:\invoiceP\pgsql\bin\pg_ctl.exe") {
    & "d:\invoiceP\pgsql\bin\pg_ctl.exe" -D "d:\invoiceP\pgsql\data" -l "d:\invoiceP\pgsql\logfile.log" start
} else {
    Write-Host "Local PostgreSQL not found, assuming external PostgreSQL on port 5432."
}

# 2. Start Backend Server
Write-Host "`n[2/3] Starting Backend API (Port 3001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PATH = 'C:\Program Files\nodejs;d:\invoiceP\pgsql\bin;' + `$env:PATH; cd d:\invoiceP\server; & 'C:\Program Files\nodejs\npm.cmd' run dev"

# 3. Start Frontend Client
Write-Host "`n[3/3] Starting Frontend Client (Port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PATH = 'C:\Program Files\nodejs;' + `$env:PATH; cd d:\invoiceP\client; & 'C:\Program Files\nodejs\npm.cmd' run dev"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "InvoiceHub is running!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Backend API: http://localhost:3001" -ForegroundColor Cyan
Write-Host "Demo Login: owner@infinityenterprises.com / password123" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green

