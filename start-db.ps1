# Start local PostgreSQL database for InvoiceHub
$ErrorActionPreference = "Stop"

$PG_DIR = "d:\invoiceP\pgsql"
$PG_BIN = "$PG_DIR\bin"
$PG_DATA = "$PG_DIR\data"
$LOGFILE = "$PG_DIR\logfile.log"

if (-not (Test-Path "$PG_BIN\pg_ctl.exe")) {
    Write-Host "PostgreSQL binaries not found at $PG_DIR." -ForegroundColor Red
    exit 1
}

Write-Host "Starting PostgreSQL on port 5432..." -ForegroundColor Cyan
& "$PG_BIN\pg_ctl.exe" -D $PG_DATA -l $LOGFILE start

Start-Sleep -Seconds 2
& "$PG_BIN\pg_ctl.exe" -D $PG_DATA status
Write-Host "PostgreSQL is running!" -ForegroundColor Green

