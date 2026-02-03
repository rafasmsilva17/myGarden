/**
 * GardenGes - Sensors API
 * Netlify Function para dados do sensor da estufa
 */

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json"
}

// Simular dados do sensor (em produção, integrar com eWeLink)
const getMockSensorData = () => {
  // Simular pequenas variações
  const baseHumidity = 58
  const baseTemp = 24
  const variation = Math.random() * 4 - 2 // -2 a +2
  
  return {
    humidity: Math.round(baseHumidity + variation),
    temperature: Math.round((baseTemp + variation * 0.5) * 10) / 10
  }
}

export const handler = async (event, context) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" }
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Apenas GET é permitido" })
    }
  }

  try {
    // TODO: Integrar com eWeLink API quando aprovado
    // Por agora, retornar dados mock
    const sensorData = getMockSensorData()
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        sensor: sensorData,
        timestamp: new Date().toISOString(),
        source: "mock" // Mudar para "ewelink" quando integrado
      })
    }

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `Erro interno: ${error.message}` })
    }
  }
}
