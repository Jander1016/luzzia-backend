#!/bin/bash

# Script para probar las mejoras del backend
echo "🧪 Testing Backend Improvements"
echo "================================"

BASE_URL="http://localhost:4000"

echo ""
echo "📊 Testing existing APIs (should work unchanged)..."
echo "GET /api/v1/prices/today"
curl -s $BASE_URL/api/v1/prices/today | jq -r '. | length' | xargs printf "Prices count: %s\n"

echo ""
echo "GET /api/v1/prices/dashboard-stats"
curl -s $BASE_URL/api/v1/prices/dashboard-stats | jq -r '.currentPrice' | xargs printf "Current price: %s€/kWh\n"

echo ""
echo "🏥 Testing new health endpoints..."
echo "GET /health"
curl -s $BASE_URL/health | jq -r '.status' | xargs printf "Health status: %s\n"

echo ""
echo "GET /health/ready"
curl -s $BASE_URL/health/ready | jq -r '.ready' | xargs printf "Ready status: %s\n"

echo ""
echo "GET /health/live"
curl -s $BASE_URL/health/live | jq -r '.alive' | xargs printf "Live status: %s\n"

echo ""
echo "✅ All tests completed!"
echo ""
echo "💡 Next steps:"
echo "- Add HealthModule to AppModule imports"
echo "- Optionally update environment variables"
echo "- Gradually migrate to enhanced services"