# PowerShell Install Script
Write-Host "=== Installing Root Modules ==="
npm install --ignore-scripts

Write-Host "=== Installing Landing Modules ==="
cd apps/landing
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
cd ../..

Write-Host "=== Installing Web Modules ==="
cd apps/web
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
cd ../..

Write-Host "=== All Modules Installed Successfully ==="

