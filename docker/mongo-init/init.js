// ============================================
// 🍃 MONGODB INITIALIZATION SCRIPT
// Configuración inicial para desarrollo
// ============================================

// Crear base de datos y usuario para la aplicación
db = db.getSiblingDB('luzzia-dev');

// Crear usuario para la aplicación
db.createUser({
  user: 'luzzia_app',
  pwd: 'luzzia_app_password',
  roles: [
    {
      role: 'readWrite',
      db: 'luzzia-dev'
    }
  ]
});

// Crear colecciones iniciales con índices
db.createCollection('prices');
db.createCollection('contacts');

// Crear índices para optimizar consultas
db.prices.createIndex({ "timestamp": 1 });
db.prices.createIndex({ "hour": 1 });
db.prices.createIndex({ "timestamp": 1, "hour": 1 });

db.contacts.createIndex({ "email": 1 }, { unique: true });
db.contacts.createIndex({ "createdAt": 1 });

// Insertar datos de ejemplo para development
db.prices.insertMany([
  {
    timestamp: new Date(),
    hour: "00",
    price: 0.08,
    currency: "EUR",
    createdAt: new Date()
  },
  {
    timestamp: new Date(),
    hour: "01", 
    price: 0.07,
    currency: "EUR",
    createdAt: new Date()
  }
]);

print('✅ MongoDB inicializado correctamente para desarrollo');
print('📊 Base de datos: luzzia-dev');
print('👤 Usuario aplicación: luzzia_app');
print('🔍 Índices creados para prices y contacts');
print('💾 Datos de ejemplo insertados');