# PowerShell Build Script
Write-Host "=== Building Apps/Landing (Next.js) ==="
cd apps/landing
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
cd ../..

Write-Host "=== Building Apps/Web (React + Vite) ==="
cd apps/web
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
cd ../..

Write-Host "=== Build Completed Successfully ==="

