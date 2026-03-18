Write-Host "Starting ATS Backends..." -ForegroundColor Green
Write-Host ""

Write-Host "Starting Python Backend (Port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; python -m uvicorn app.main:app --reload --port 8000" -WindowStyle Normal

Write-Host "Starting Node.js Backend (Port 5000)..." -ForegroundColor Yellow  
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "Both backends are starting..." -ForegroundColor Green
Write-Host "Python Backend: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Node.js Backend: http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit this script..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 