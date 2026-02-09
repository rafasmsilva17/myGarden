/**
 * GardenGes - Sensor History API
 * Netlify Function para obter histórico de leituras do sensor
 */

import { createClient } from '@supabase/supabase-js'

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json"
}

// Mapear range para intervalo SQL
const getRangeInterval = (range) => {
  switch (range) {
    case '24h':
      return { hours: 24, interval: '24 hours' }
    case '7d':
      return { hours: 24 * 7, interval: '7 days' }
    case '30d':
      return { hours: 24 * 30, interval: '30 days' }
    default:
      return { hours: 24, interval: '24 hours' }
  }
}

// Calcular estatísticas
const calculateStats = (data) => {
  if (!data || data.length === 0) {
    return {
      temperatura: { min: 0, max: 0, avg: 0 },
      humidade: { min: 0, max: 0, avg: 0 },
      vpd: { min: 0, max: 0, avg: 0 }
    }
  }

  const temps = data.map(d => d.temperatura_c)
  const hums = data.map(d => d.humidade_perc)
  const vpds = data.filter(d => d.vpd !== null).map(d => d.vpd)

  return {
    temperatura: {
      min: Math.min(...temps),
      max: Math.max(...temps),
      avg: Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10
    },
    humidade: {
      min: Math.min(...hums),
      max: Math.max(...hums),
      avg: Math.round((hums.reduce((a, b) => a + b, 0) / hums.length) * 10) / 10
    },
    vpd: vpds.length > 0 ? {
      min: Math.round(Math.min(...vpds) * 1000) / 1000,
      max: Math.round(Math.max(...vpds) * 1000) / 1000,
      avg: Math.round((vpds.reduce((a, b) => a + b, 0) / vpds.length) * 1000) / 1000
    } : null
  }
}

export const handler = async (event) => {
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
    // Parâmetros da query
    const params = event.queryStringParameters || {}
    const range = params.range || '24h'
    const { interval } = getRangeInterval(range)

    // Configurar Supabase
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Supabase não configurado" })
      }
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Calcular data de início baseada no range
    const startDate = new Date()
    switch (range) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24)
        break
      case '7d':
        startDate.setDate(startDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(startDate.getDate() - 30)
        break
      default:
        startDate.setHours(startDate.getHours() - 24)
    }

    // Query ao histórico
    const { data, error } = await supabase
      .from('sensor_history')
      .select('id, timestamp, temperatura_c, humidade_perc, vpd, device_name')
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: true })

    if (error) {
      console.error('Erro Supabase:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: `Erro na base de dados: ${error.message}` })
      }
    }

    // Calcular estatísticas
    const stats = calculateStats(data)

    // Formatar resposta
    const response = {
      range,
      count: data?.length || 0,
      stats,
      data: data || []
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    }

  } catch (error) {
    console.error('Erro:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `Erro interno: ${error.message}` })
    }
  }
}
