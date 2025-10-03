const axios = require('axios');

async function testDatabase() {
  try {
    console.log('🗃️ Conectando a MongoDB para diagnóstico directo...');
    
    // Simular consulta directa como haría MongoDB
    const now = new Date();
    console.log(`⏰ Fecha/hora actual: ${now.toISOString()}`);
    console.log(`⏰ Fecha local: ${now.toString()}`);
    
    // UTC dates
    const todayUTC = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    todayUTC.setUTCHours(0, 0, 0, 0);
    const tomorrowUTC = new Date(todayUTC);
    tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1);
    
    console.log(`📅 Buscando desde (UTC): ${todayUTC.toISOString()}`);
    console.log(`📅 Buscando hasta (UTC): ${tomorrowUTC.toISOString()}`);
    
    // Local dates
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowLocal = new Date(todayLocal.getTime() + 24 * 60 * 60 * 1000);
    
    console.log(`📅 Fecha local desde: ${todayLocal.toISOString()}`);
    console.log(`📅 Fecha local hasta: ${tomorrowLocal.toISOString()}`);
    
  } catch (error) {
    console.log('❌ Error en diagnóstico:', error.message);
  }
}

async function testFetch() {
  try {
    console.log('🚀 Probando endpoint fetch...');
    
    const response = await axios.post('http://localhost:4000/api/v1/prices/fetch', {}, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 segundos
    });
    
    console.log('✅ Fetch exitoso:', response.data);
    return true;
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Servidor no está ejecutándose en puerto 4000');
      return false;
    } else if (error.response) {
      console.log('❌ Error del servidor:', error.response.status, error.response.data);
      return false;
    } else {
      console.log('❌ Error de conexión:', error.message);
      return false;
    }
  }
}

async function testToday() {
  try {
    console.log('📊 Probando endpoint today...');
    
    const response = await axios.get('http://localhost:4000/api/v1/prices/today', {
      timeout: 10000
    });
    
    console.log('✅ Today exitoso:', response.data.length, 'precios encontrados');
    if (response.data.length > 0) {
      console.log('🔍 Primer precio:', response.data[0]);
      console.log('🔍 Último precio:', response.data[response.data.length - 1]);
    }
    return true;
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Error en today:', error.response.status, error.response.data);
    } else {
      console.log('❌ Error en today:', error.message);
    }
    return false;
  }
}

async function testServer() {
  try {
    console.log('🔍 Verificando si el servidor está activo...');
    const response = await axios.get('http://localhost:4000/api/v1/health', {
      timeout: 5000
    });
    console.log('✅ Servidor activo');
    
    // Diagnóstico de fechas
    await testDatabase();
    
    // Test fetch
    const fetchOk = await testFetch();
    
    if (fetchOk) {
      // Esperar un poco y probar today
      console.log('⏳ Esperando 2 segundos...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      await testToday();
    }
    
  } catch (error) {
    console.log('❌ Servidor no responde');
    console.log('💡 Asegúrate de que el servidor esté ejecutándose con: pnpm run start:dev');
  }
}

testServer();