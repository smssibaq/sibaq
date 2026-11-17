# PowerShell Test Script
Write-Host "=== Running Tests in Apps/Web ==="
cd apps/web
npm run test
exit $LASTEXITCODE

