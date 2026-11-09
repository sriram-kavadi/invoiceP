# Stop local PostgreSQL database for InvoiceHub
$PG_DIR = "d:\invoiceP\pgsql"
$PG_BIN = "$PG_DIR\bin"
$PG_DATA = "$PG_DIR\data"

if (Test-Path "$PG_BIN\pg_ctl.exe") {
    Write-Host "Stopping PostgreSQL..." -ForegroundColor Yellow
    & "$PG_BIN\pg_ctl.exe" -D $PG_DATA stop -m fast
    Write-Host "PostgreSQL stopped." -ForegroundColor Green
}

