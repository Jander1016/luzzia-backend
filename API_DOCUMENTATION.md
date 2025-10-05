# Nuevos Endpoints de Precios - API Documentation

## Endpoints Implementados

### 1. GET /api/v1/prices/dashboard-stats
**Descripción:** Obtiene estadísticas principales para el dashboard

**Response:**
```json
{
  "currentPrice": 0.12,
  "nextHourPrice": 0.15,
  "priceChangePercentage": 25.0,
  "monthlySavings": 15.5,
  "comparisonType": "tarifa fija",
  "lastUpdated": "2025-10-01T12:00:00Z"
}
```

### 2. GET /api/v1/prices/hourly?period=today|week|month
**Descripción:** Obtiene precios por horas según el período especificado

**Parámetros:**
- `period` (opcional): `today`, `week`, `month` (default: `today`)

**Response:**
```json
{
  "prices": [
    {
      "timestamp": "2025-10-01T00:00:00Z",
      "hour": "00",
      "price": 0.08,
      "level": "bajo",
      "currency": "EUR"
    },
    {
      "timestamp": "2025-10-01T01:00:00Z",
      "hour": "01", 
      "price": 0.12,
      "level": "medio",
      "currency": "EUR"
    }
  ],
  "average": 0.125,
  "min": 0.05,
  "max": 0.25
}
```

**Niveles de precio:**
- `bajo`: Precio en el 25% más barato
- `medio`: Precio en el rango medio
- `alto`: Precio en el 25% más caro
- `muy-alto`: Precio en el 10% más caro

### 3. GET /api/v1/prices/recommendations
**Descripción:** Obtiene recomendaciones inteligentes para uso de electrodomésticos

**Response:**
```json
{
  "recommendations": [
    {
      "type": "ideal",
      "title": "Momento ideal",
      "description": "Pon la lavadora ahora",
      "timeRange": "Próximas 2 horas",
      "percentage": "40%",
      "appliance": "lavadora",
      "savingsPercentage": 25
    },
    {
      "type": "avoid",
      "title": "Evitar ahora",
      "description": "Espera para usar electrodomésticos de alto consumo",
      "timeRange": "Hasta las 18:00",
      "percentage": "35%",
      "appliance": "lavavajillas"
    },
    {
      "type": "schedule",
      "title": "Programar para más tarde",
      "description": "Programa el lavavajillas para las 14:00",
      "timeRange": "A las 14:00",
      "appliance": "lavavajillas",
      "savingsPercentage": 30
    }
  ],
  "dailyTip": "Los precios más baratos serán a las 14:00 y los más caros a las 20:00. Ahorra hasta un 60% eligiendo bien el momento."
}
```

**Tipos de recomendación:**
- `ideal`: Momento óptimo para usar electrodomésticos
- `avoid`: Evitar usar electrodomésticos por precios altos
- `schedule`: Programar uso para horarios más económicos

## WebSocket Real-time

### Conexión
```javascript
// Conectar al WebSocket
const socket = io('ws://localhost:3000/prices');

// Escuchar actualizaciones de precios
socket.on('price_update', (data) => {
  console.log('Price update:', data);
});
```

### Evento: price_update
```json
{
  "type": "price_update",
  "data": {
    "currentPrice": 0.12,
    "timestamp": "2025-10-01T12:00:00Z",
    "level": "medio"
  }
}
```

## Lógica de Negocio

### Cálculo de Niveles de Precio
Los niveles se calculan basándose en los precios del período:
- **bajo**: Precio ≤ (min + 25% del rango)
- **medio**: Precio ≤ (min + 50% del rango)
- **alto**: Precio ≤ (min + 75% del rango)
- **muy-alto**: Precio > (min + 75% del rango)

### Cálculo de Ahorros
- **Ahorro mensual**: Comparación con tarifa fija de 0.20 €/kWh
- **Ahorro por recomendación**: Comparación con precio promedio del día

### Recomendaciones Inteligentes
- **Ideal**: Cuando el precio actual ≤ 80% del precio promedio
- **Evitar**: Cuando el precio actual ≥ 120% del precio promedio
- **Programar**: Sugiere la hora más barata del día restante

## Ejemplos de Uso

### Frontend React/Vue
```javascript
// Obtener estadísticas del dashboard
const dashboardStats = await fetch('/api/v1/prices/dashboard-stats');

// Obtener precios de hoy
const todayPrices = await fetch('/api/v1/prices/hourly?period=today');

// Obtener recomendaciones
const recommendations = await fetch('/api/v1/prices/recommendations');

// WebSocket para tiempo real
const socket = io('/prices');
socket.on('price_update', updatePriceDisplay);
```

### Aplicación móvil
```javascript
// Notificaciones push basadas en recomendaciones
const recommendations = await getPriceRecommendations();
if (recommendations.some(r => r.type === 'ideal')) {
  sendPushNotification('¡Momento ideal para usar electrodomésticos!');
}
```

## Swagger Documentation
Todos los endpoints están documentados en Swagger UI:
`http://localhost:3000/api/v1/documentation`