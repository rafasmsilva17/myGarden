/**
 * myGarden - Auto Notifications
 * Verifica sensores reais e envia notificações via ntfy.sh
 */

import { createClient } from '@supabase/supabase-js'
import eWeLinkModule from 'ewelink-api-next'

const eWeLink = eWeLinkModule.default || eWeLinkModule

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
}

const EWELINK_APP_ID = '4s1FXKC9FaGfoqXhmXSJneb3qcm1gOak'
const EWELINK_APP_SECRET = 'oKvCM06gvwkRbfetd6qWRrbC3rFrbIpV'

// Buscar dados reais do sensor via eWeLink
const getEwelinkSensorData = async () => {
  const email = process.env.EWELINK_EMAIL
  const password = process.env.EWELINK_PASSWORD
  const deviceId = process.env.EWELINK_DEVICE_FLOOR_1

  if (!email || !password || !deviceId) {
    return { error: `Credenciais em falta: email=${!!email}, pass=${!!password}, device=${!!deviceId}` }
  }

  try {
    const client = new eWeLink.WebAPI({
      appId: EWELINK_APP_ID,
      appSecret: EWELINK_APP_SECRET,
      region: 'eu',
    })

    const login = await client.user.login({
      account: email,
      password: password,
      areaCode: '+351'
    })

    if (login.error !== 0) {
      return { error: `Login falhou: ${login.error} - ${login.msg}` }
    }

    const res = await client.device.getThings({
      thingList: [{ itemType: 1, id: deviceId }]
    })

    if (res.error !== 0 || !res.data?.thingList?.length) {
      return { error: `getThings falhou: ${res.error} - ${res.msg}` }
    }

    const device = res.data.thingList[0].itemData
    const params = device.params || {}

    const rawTemp = parseFloat(params.temperature || '0')
    const rawHum = parseFloat(params.humidity || '0')
    const temperature = rawTemp > 200 ? Math.round(rawTemp / 100 * 10) / 10 : rawTemp
    const humidity = rawHum > 200 ? Math.round(rawHum / 100 * 10) / 10 : rawHum

    return {
      humidity: Math.round(humidity),
      temperature: Math.round(temperature * 10) / 10,
      deviceName: device.name
    }
  } catch (error) {
    return { error: `eWeLink: ${error.message}` }
  }
}

// Enviar notificação via ntfy.sh
const sendNtfyNotification = async (topic, title, message, priority = 'default') => {
  if (!topic) return false
  try {
    const response = await fetch('https://ntfy.sh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        title: title || 'myGarden',
        message: message || 'Notificação do myGarden',
        priority: priority === 'high' ? 4 : 3,
        tags: ['seedling', 'droplet']
      })
    })
    return response.ok
  } catch (error) {
    return false
  }
}

// Calcular VPD (Vapor Pressure Deficit) em kPa
// VPD = SVP * (1 - RH/100) onde SVP = 0.6108 * exp(17.27 * T / (T + 237.3))
const calculateVPD = (temperatureC, humidityPercent) => {
  const svp = 0.6108 * Math.exp((17.27 * temperatureC) / (temperatureC + 237.3))
  const vpd = svp * (1 - humidityPercent / 100)
  return Math.round(vpd * 1000) / 1000 // 3 casas decimais
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" }
  }

  const logs = []
  const log = (msg) => { console.log(msg); logs.push(msg) }

  try {
    log('🔔 Iniciando verificação...')

    // 1. Env check
    const envCheck = {
      SUPABASE_URL: !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
      SUPABASE_KEY: !!(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
      EWELINK_EMAIL: !!process.env.EWELINK_EMAIL,
      EWELINK_PASSWORD: !!process.env.EWELINK_PASSWORD,
      EWELINK_DEVICE: !!process.env.EWELINK_DEVICE_FLOOR_1,
      NTFY_TOPIC: !!process.env.NTFY_TOPIC
    }
    log(`🔑 ${JSON.stringify(envCheck)}`)

    // 2. Sensor data
    log('📡 A ligar ao eWeLink...')
    const sensorData = await getEwelinkSensorData()

    if (sensorData.error) {
      log(`❌ Sensor: ${sensorData.error}`)
      return { statusCode: 500, headers, body: JSON.stringify({ error: sensorData.error, logs }) }
    }
    log(`📊 ${sensorData.humidity}% humidade, ${sensorData.temperature}°C (${sensorData.deviceName})`)

    // 3. Supabase (usa service_role key para bypass RLS)
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      log(`⚠️ Supabase não configurado (url=${!!supabaseUrl}, key=${!!supabaseKey})`)
      const topic = process.env.NTFY_TOPIC
      if (topic) {
        const msg = `Humidade: ${sensorData.humidity}% | Temp: ${sensorData.temperature}°C`
        const sent = await sendNtfyNotification(topic, '🌱 myGarden', msg)
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, fallback: true, sent, sensorData, logs }) }
      }
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Sem Supabase nem NTFY_TOPIC', logs }) }
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    log(`✅ Supabase OK (service_role: ${supabaseKey.includes('service_role') ? 'sim' : 'não'})`)

    // 3.5 Guardar leitura no histórico (sensor_history)
    try {
      const vpd = calculateVPD(sensorData.temperature, sensorData.humidity)
      const { error: historyError } = await supabase
        .from('sensor_history')
        .insert({
          timestamp: new Date().toISOString(),
          temperatura_c: sensorData.temperature,
          humidade_perc: sensorData.humidity,
          vpd: vpd,
          device_name: sensorData.deviceName || null
        })
      
      if (historyError) {
        log(`⚠️ Erro ao guardar histórico: ${historyError.message}`)
      } else {
        log(`📈 Histórico guardado (VPD: ${vpd} kPa)`)
      }
    } catch (histErr) {
      log(`⚠️ Histórico falhou: ${histErr.message}`)
    }

    // 4. Buscar utilizadores
    const { data: users, error: usersError } = await supabase
      .from('user_settings')
      .select('user_id, ntfy_topic')
      .not('ntfy_topic', 'is', null)

    // Fallback se tabela não existe ou sem utilizadores
    if (usersError || !users || users.length === 0) {
      if (usersError) log(`⚠️ user_settings: ${JSON.stringify(usersError)}`)
      else log('ℹ️ Sem utilizadores com ntfy configurado')

      const topic = process.env.NTFY_TOPIC
      if (topic) {
        log(`⚠️ Fallback → ${topic}`)

        // Buscar target real das plantas na BD
        const { data: allPlants } = await supabase
          .from('plants')
          .select('targets_humidade')
        
        const avgTarget = allPlants?.length > 0
          ? Math.round(allPlants.reduce((s, p) => s + (p.targets_humidade || 65), 0) / allPlants.length)
          : 65
        
        log(`🌱 Target médio: ${avgTarget}% (${allPlants?.length || 0} plantas)`)
        const diff = avgTarget - sensorData.humidity
        const excessHumidity = sensorData.humidity - avgTarget

        if (diff > 5) {
          // Humidade muito baixa - precisa de rega
          const sprays = Math.round((diff * 2) / 0.55)
          const msg = `A estufa precisa de ~${sprays} sprays. Humidade: ${sensorData.humidity}% (target: ${avgTarget}%)`
          const sent = await sendNtfyNotification(topic, '🌱 myGarden - Rega necessária!', msg, 'high')
          log(sent ? '✅ Notificação enviada!' : '❌ Falha ntfy')
          return { statusCode: 200, headers, body: JSON.stringify({ success: true, fallback: true, sent, sensorData, logs }) }
        } else if (excessHumidity > 10) {
          // Humidade muito alta - precisa de ventilação
          const msg = `Humidade elevada (${sensorData.humidity}%). Target: ${avgTarget}%. Abrir estufa para ventilar e evitar fungos.`
          const sent = await sendNtfyNotification(topic, '💨 myGarden - Ventilar estufa!', msg, 'high')
          log(sent ? '✅ Notificação de ventilação enviada!' : '❌ Falha ntfy')
          return { statusCode: 200, headers, body: JSON.stringify({ success: true, fallback: true, type: 'ventilation', sent, sensorData, logs }) }
        }

        log(`✓ Humidade OK (${sensorData.humidity}% vs ${avgTarget}%)`)
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Humidade OK', sensorData, logs }) }
      }

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Nada a fazer', sensorData, logs }) }
    }

    // 5. Processar utilizadores
    log(`👥 ${users.length} utilizadores`)
    let sent = 0

    for (const user of users) {
      try {
        const { data: plants } = await supabase
          .from('plants')
          .select('id, nome, targets_humidade')
          .eq('user_id', user.user_id)

        const avgTarget = plants?.length > 0
          ? plants.reduce((s, p) => s + (p.targets_humidade || 65), 0) / plants.length
          : 65

        const diff = avgTarget - sensorData.humidity
        const excessHumidity = sensorData.humidity - avgTarget

        if (diff > 5) {
          // Humidade muito baixa - precisa de rega
          const { data: lastNotif } = await supabase
            .from('notifications_log')
            .select('created_at')
            .eq('user_id', user.user_id)
            .eq('type', 'watering')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          const canNotify = !lastNotif || (Date.now() - new Date(lastNotif.created_at).getTime()) >= 3600000

          if (canNotify) {
            const sprays = Math.round((diff * 2) / 0.55)
            const msg = `~${sprays} sprays necessários. Humidade: ${sensorData.humidity}% (target: ${Math.round(avgTarget)}%)`
            const ok = await sendNtfyNotification(user.ntfy_topic, '🌱 Rega necessária!', msg, 'high')
            if (ok) {
              await supabase.from('notifications_log').insert({
                user_id: user.user_id, type: 'watering', message: msg, created_at: new Date().toISOString()
              })
              sent++
              log(`✅ Enviado (rega) → ${user.ntfy_topic}`)
            }
          } else {
            log(`⏳ ${user.user_id} já notificado (rega)`)
          }
        } else if (excessHumidity > 10) {
          // Humidade muito alta - precisa de ventilação
          const { data: lastNotif } = await supabase
            .from('notifications_log')
            .select('created_at')
            .eq('user_id', user.user_id)
            .eq('type', 'ventilation')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          const canNotify = !lastNotif || (Date.now() - new Date(lastNotif.created_at).getTime()) >= 3600000

          if (canNotify) {
            const msg = `Humidade elevada (${sensorData.humidity}%). Target: ${Math.round(avgTarget)}%. Abrir estufa para ventilar e evitar fungos.`
            const ok = await sendNtfyNotification(user.ntfy_topic, '💨 Ventilar estufa!', msg, 'high')
            if (ok) {
              await supabase.from('notifications_log').insert({
                user_id: user.user_id, type: 'ventilation', message: msg, created_at: new Date().toISOString()
              })
              sent++
              log(`✅ Enviado (ventilação) → ${user.ntfy_topic}`)
            }
          } else {
            log(`⏳ ${user.user_id} já notificado (ventilação)`)
          }
        } else {
          log(`✓ OK para ${user.user_id}`)
        }
      } catch (e) {
        log(`❌ ${user.user_id}: ${e.message}`)
      }
    }

    log(`✅ Completo. ${sent} notificações.`)
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, sent, sensorData, logs }) }

  } catch (error) {
    log(`💥 ${error.message}`)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message, stack: error.stack?.split('\n').slice(0, 3), logs }) }
  }
}
