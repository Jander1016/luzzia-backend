# Script para probar las mejoras del backend
Write-Host "🧪 Testing Backend Improvements" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

$BASE_URL = "http://localhost:4000"

Write-Host ""
Write-Host "📊 Testing existing APIs (should work unchanged)..." -ForegroundColor Yellow

Write-Host "GET /api/v1/prices/today"
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/v1/prices/today" -Method Get
    Write-Host "Prices count: $($response.Count)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "GET /api/v1/prices/dashboard-stats"
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/v1/prices/dashboard-stats" -Method Get
    Write-Host "Current price: $($response.currentPrice)€/kWh" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🏥 Testing new health endpoints..." -ForegroundColor Yellow

Write-Host "GET /health"
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/health" -Method Get
    Write-Host "Health status: $($response.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "GET /health/ready"
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/health/ready" -Method Get
    Write-Host "Ready status: $($response.ready)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "GET /health/live" 
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/health/live" -Method Get
    Write-Host "Live status: $($response.alive)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ All tests completed!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Next steps:" -ForegroundColor Cyan
Write-Host "- Add HealthModule to AppModule imports"
Write-Host "- Optionally update environment variables" 
Write-Host "- Gradually migrate to enhanced services"