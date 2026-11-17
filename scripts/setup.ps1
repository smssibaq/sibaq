# One-shot local setup for Windows (PowerShell)
# Installs all dependencies and creates .env.local files from the examples if missing.
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

foreach ($app in @("web", "landing")) {
  $example = "apps/$app/.env.example"
  $local = "apps/$app/.env.local"
  if (-not (Test-Path $local)) {
    Copy-Item $example $local
    Write-Host "Created $local from .env.example"
  }
}

Write-Host "=== Installing dependencies (root, landing, web) ==="
npm install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run install:all
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Done. Start both apps with:  npm run dev"
Write-Host "  Landing: http://localhost:3000"
Write-Host "  Web app: http://localhost:5173"
