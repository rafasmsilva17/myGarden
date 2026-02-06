/**
 * myGarden - Auto Notifications
 * Netlify Scheduled Function para verificar sensores e enviar notificações
 * Executada periodicamente (ex: a cada 10 minutos)
 */

import { createClient } from '@supabase/supabase-js'

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
}

// Inicializar Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

// Obter dados dos sensores (mock por agora)
const getMockSensorData = () => {
  const baseHumidity = 58
  const baseTemp = 24
  const variation = Math.random() * 4 - 2
  
  return {
    humidity: Math.round(baseHumidity + variation),
    temperature: Math.round((baseTemp + variation * 0.5) * 10) / 10
  }
}

// Enviar notificação via ntfy.sh
const sendNtfyNotification = async (topic, title, message, priority = 'default') => {
  if (!topic) {
    console.log('Tópico ntfy vazio, pulando notificação')
    return false
  }

  try {
    const response = await fetch('https://ntfy.sh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        topic: topic,
        title: title || 'myGarden',
        message: message || 'Notificação do myGarden',
        priority: priority === 'high' ? 4 : 3,
        tags: ['seedling', 'droplet']
      })
    })

    if (response.ok) {
      console.log(`✓ Notificação enviada para ${topic}: ${title}`)
      return true
    } else {
      console.error(`✗ Erro ao enviar notificação: ${response.statusText}`)
      return false
    }
  } catch (error) {
    console.error(`✗ Erro ao enviar notificação: ${error.message}`)
    return false
  }
}

// Verificar se precisa notificar (com controlo de spam)
const shouldNotify = async (userId, lastNotifyKey) => {
  const oneHourMs = 60 * 60 * 1000
  const now = Date.now()
  
  try {
    // Buscar último registo de notificação
    const { data, error } = await supabase
      .from('notifications_log')
      .select('created_at')
      .eq('user_id', userId)
      .eq('type', lastNotifyKey)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Erro ao verificar último aviso:', error)
      return true // Notificar por segurança
    }

    if (!data) {
      return true // Primeira notificação
    }

    const lastNotifyTime = new Date(data.created_at).getTime()
    const timeSinceLastNotify = now - lastNotifyTime

    return timeSinceLastNotify >= oneHourMs
  } catch (error) {
    console.error('Erro ao verificar spam:', error)
    return true // Notificar por segurança
  }
}

// Registar notificação enviada
const logNotification = async (userId, type, message) => {
  try {
    // Criar tabela se não existir (será criada via schema.sql)
    await supabase
      .from('notifications_log')
      .insert({
        user_id: userId,
        type: type,
        message: message,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Erro ao registar notificação:', error)
  }
}

// Função principal
export const handler = async (event, context) => {
  // Permitir CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" }
  }

  // Permite GET ou POST (GET para scheduled, POST manual)
  if (!['GET', 'POST'].includes(event.httpMethod)) {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Método não permitido" })
    }
  }

  try {
    console.log('🔔 Iniciando verificação automática de notificações...')
    
    // Obter dados do sensor (mock por agora)
    const sensorData = getMockSensorData()
    console.log(`📊 Dados do sensor: ${sensorData.humidity}% humidade, ${sensorData.temperature}°C`)

    // Buscar todos os utilizadores com notificações configuradas
    const { data: users, error: usersError } = await supabase
      .from('user_settings')
      .select('user_id, ntfy_topic')
      .not('ntfy_topic', 'is', null)

    if (usersError) {
      console.error('Erro ao buscar utilizadores:', usersError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Erro ao buscar utilizadores" })
      }
    }

    if (!users || users.length === 0) {
      console.log('ℹ️  Nenhum utilizador com notificações configuradas')
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: "Sem utilizadores para notificar" 
        })
      }
    }

    console.log(`👥 Verificando ${users.length} utilizadores...`)

    let notificationsCount = 0

    // Processar cada utilizador
    for (const user of users) {
      const userId = user.user_id
      const topic = user.ntfy_topic

      try {
        // Buscar plantas do utilizador
        const { data: plants, error: plantsError } = await supabase
          .from('plants')
          .select('id, nome, targets_humidade')
          .eq('user_id', userId)

        if (plantsError) {
          console.error(`Erro ao buscar plantas do utilizador ${userId}:`, plantsError)
          continue
        }

        if (!plants || plants.length === 0) {
          console.log(`ℹ️  Utilizador ${userId} não tem plantas`)
          continue
        }

        // Calcular humidade média alvo
        const avgTargetHumidity = plants.reduce((sum, p) => sum + (p.targets_humidade || 65), 0) / plants.length
        const humidityDiff = avgTargetHumidity - sensorData.humidity

        console.log(`👤 Utilizador ${userId}: ${plants.length} plantas, target=${Math.round(avgTargetHumidity)}%, current=${sensorData.humidity}%`)

        // Se a humidade está muito baixa, verificar spam e notificar
        if (humidityDiff > 5) {
          const canNotify = await shouldNotify(userId, 'watering')

          if (canNotify) {
            const sprays = Math.round((humidityDiff * 2) / 0.55)
            const message = `A estufa precisa de ~${sprays} sprays. Humidade: ${sensorData.humidity}% (target: ${Math.round(avgTargetHumidity)}%)`

            const sent = await sendNtfyNotification(
              topic,
              '🌱 myGarden - Rega necessária!',
              message,
              'high'
            )

            if (sent) {
              await logNotification(userId, 'watering', message)
              notificationsCount++
            }
          } else {
            console.log(`⏳ Utilizador ${userId} já foi notificado há menos de 1 hora`)
          }
        } else {
          console.log(`✓ Humidade OK para utilizador ${userId}`)
        }

      } catch (error) {
        console.error(`Erro ao processar utilizador ${userId}:`, error)
      }
    }

    console.log(`✅ Verificação completa. ${notificationsCount} notificações enviadas.`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        usersChecked: users.length,
        notificationsSent: notificationsCount,
        sensorData: sensorData
      })
    }

  } catch (error) {
    console.error('Erro na verificação automática:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `Erro: ${error.message}` })
    }
  }
}
