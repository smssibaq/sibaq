# PowerShell Check Script
Write-Host "=== 1/4 Typechecking Landing ==="
cd apps/landing
npm run typecheck
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
cd ../..

Write-Host "=== 2/4 Typechecking Web ==="
cd apps/web
npm run typecheck
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
cd ../..

Write-Host "=== 3/4 Running Tests in Web ==="
cd apps/web
npm run test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
cd ../..

Write-Host "=== 4/4 Building Both Applications ==="
cd apps/landing
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
cd ../..

cd apps/web
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
cd ../..

Write-Host "=== ALL QUALITY GATES PASSED ==="

