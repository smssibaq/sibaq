# PowerShell Dev Script for Windows
Write-Host "Starting ApexBuild development environments..."
Write-Host "Landing app on: http://localhost:3000"
Write-Host "Web app on:     http://localhost:5173"

$landing = Start-Process -PassThru powershell -ArgumentList "-NoExit", "-Command", "cd apps/landing; npm run dev"
$web = Start-Process -PassThru powershell -ArgumentList "-NoExit", "-Command", "cd apps/web; npm run dev"

Write-Host "Both processes started. Close spawned windows to stop."

