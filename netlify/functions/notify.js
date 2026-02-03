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

    // Enviar notificação para ntfy.sh
    const response = await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      headers: {
        'Title': title || 'myGarden',
        'Priority': priority || 'default',
        'Tags': 'seedling,droplet'
      },
      body: message || 'Notificação do myGarden'
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
