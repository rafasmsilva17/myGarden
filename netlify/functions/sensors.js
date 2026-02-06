/**
 * GardenGes - Sensors API (eWeLink Integration)
 * Netlify Function para dados reais do sensor SONOFF SNZB-02D via eWeLink
 */

import eWeLinkModule from 'ewelink-api-next'

const eWeLink = eWeLinkModule.default || eWeLinkModule

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json"
}

// APP_ID que funciona com a rota getThings
const EWELINK_APP_ID = '4s1FXKC9FaGfoqXhmXSJneb3qcm1gOak'
const EWELINK_APP_SECRET = 'oKvCM06gvwkRbfetd6qWRrbC3rFrbIpV'

// Buscar dados reais do sensor via eWeLink API
const getEwelinkSensorData = async (deviceId) => {
  const email = process.env.EWELINK_EMAIL
  const password = process.env.EWELINK_PASSWORD

  if (!email || !password || !deviceId) {
    console.log('❌ Credenciais eWeLink em falta:', { email: !!email, password: !!password, deviceId: !!deviceId })
    return null
  }

  try {
    const client = new eWeLink.WebAPI({
      appId: EWELINK_APP_ID,
      appSecret: EWELINK_APP_SECRET,
      region: 'eu',
    })

    // Login
    const login = await client.user.login({
      account: email,
      password: password,
      areaCode: '+351'
    })

    if (login.error !== 0) {
      console.log('❌ Login eWeLink falhou:', login.error, login.msg)
      return null
    }

    console.log('✅ Login eWeLink OK')

    // Buscar dados do dispositivo via getThings
    const res = await client.device.getThings({
      thingList: [{ itemType: 1, id: deviceId }]
    })

    if (res.error !== 0 || !res.data?.thingList?.length) {
      console.log('❌ getThings falhou:', res.error, res.msg)
      return null
    }

    const device = res.data.thingList[0].itemData
    const params = device.params || {}

    console.log(`📡 Dispositivo: ${device.name} (${device.extra?.reportProduct || 'unknown'})`)
    console.log(`🔋 Bateria: ${params.battery}%`)
    console.log(`📶 Online: ${device.online}`)

    // SONOFF SNZB-02D retorna valores *100 (ex: "2150" = 21.50°C, "6480" = 64.80%)
    const rawTemp = parseFloat(params.temperature || '0')
    const rawHum = parseFloat(params.humidity || '0')

    // Se valores > 200, estão multiplicados por 100
    const temperature = rawTemp > 200 ? Math.round(rawTemp / 100 * 10) / 10 : rawTemp
    const humidity = rawHum > 200 ? Math.round(rawHum / 100 * 10) / 10 : rawHum

    console.log(`🌡️ Temperatura: ${temperature}°C (raw: ${rawTemp})`)
    console.log(`💧 Humidade: ${humidity}% (raw: ${rawHum})`)

    return {
      humidity: Math.round(humidity),
      temperature: Math.round(temperature * 10) / 10,
      battery: params.battery || null,
      online: device.online,
      deviceName: device.name
    }

  } catch (error) {
    console.error('❌ Erro eWeLink:', error.message)
    return null
  }
}

// Dados mock como fallback
const getMockSensorData = () => {
  const baseHumidity = 58
  const baseTemp = 24
  const variation = Math.random() * 4 - 2
  return {
    humidity: Math.round(baseHumidity + variation),
    temperature: Math.round((baseTemp + variation * 0.5) * 10) / 10
  }
}

export const handler = async (event, context) => {
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
    const deviceId = process.env.EWELINK_DEVICE_FLOOR_1

    if (deviceId && process.env.EWELINK_EMAIL) {
      const sensorData = await getEwelinkSensorData(deviceId)

      if (sensorData && (sensorData.humidity > 0 || sensorData.temperature > 0)) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            sensor: {
              humidity: sensorData.humidity,
              temperature: sensorData.temperature
            },
            battery: sensorData.battery,
            online: sensorData.online,
            deviceName: sensorData.deviceName,
            timestamp: new Date().toISOString(),
            source: "ewelink",
            deviceId: deviceId
          })
        }
      }
    }

    // Fallback para dados mock
    console.log('⚠️ A usar dados mock (eWeLink indisponível)')
    const sensorData = getMockSensorData()

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        sensor: sensorData,
        timestamp: new Date().toISOString(),
        source: "mock",
        note: "Dados simulados. Verifique as credenciais eWeLink."
      })
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `Erro interno: ${error.message}` })
    }
  }
}
