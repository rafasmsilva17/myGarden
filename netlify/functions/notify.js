/**
 * myGarden - Notifications API
 * Netlify Function para enviar notificações via ntfy.sh
 */

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
}

export const handler = async (event, context) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" }
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Apenas POST é permitido" })
    }
  }

  try {
    const body = JSON.parse(event.body || "{}")
    const { topic, title, message, priority } = body
    
    if (!topic) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Topic ntfy é obrigatório" })
      }
    }

    // Enviar notificação para ntfy.sh via JSON (suporta UTF-8/emojis)
    const response = await fetch(`https://ntfy.sh`, {
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
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: "Notificação enviada!" })
      }
    } else {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Erro ao enviar notificação" })
      }
    }

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `Erro: ${error.message}` })
    }
  }
}
