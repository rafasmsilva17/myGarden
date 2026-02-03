/**
 * GardenGes - Plants API
 * Netlify Function para gerir plantas
 */

// Simular base de dados em memória (em produção usar DB real)
let plantsDB = [
  {
    id: '1',
    nome: 'Manjericão',
    andar: 1,
    slot_index: 2,
    data_inicio: '2026-01-15',
    ajuste_dias: 0,
    ciclo_total: 60,
    targets_humidade: 65
  },
  {
    id: '2',
    nome: 'Tomate Cherry',
    andar: 1,
    slot_index: 5,
    data_inicio: '2026-01-01',
    ajuste_dias: 5,
    ciclo_total: 90,
    targets_humidade: 70
  },
  {
    id: '3',
    nome: 'Habanero',
    andar: 2,
    slot_index: 1,
    data_inicio: '2026-01-10',
    ajuste_dias: 0,
    ciclo_total: 120,
    targets_humidade: 60
  }
]

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Content-Type": "application/json"
}

export const handler = async (event, context) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" }
  }

  const path = event.path.replace('/.netlify/functions/plants', '')
  const plantId = path.replace('/', '')

  try {
    // GET - Listar todas as plantas
    if (event.httpMethod === "GET" && !plantId) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ plants: plantsDB })
      }
    }

    // GET - Obter planta específica
    if (event.httpMethod === "GET" && plantId) {
      const plant = plantsDB.find(p => p.id === plantId)
      if (!plant) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Planta não encontrada" })
        }
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ plant })
      }
    }

    // POST - Adicionar nova planta
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}")
      const newPlant = {
        id: Date.now().toString(),
        nome: body.nome,
        andar: body.andar,
        slot_index: body.slot_index,
        data_inicio: body.data_inicio || new Date().toISOString().split('T')[0],
        ajuste_dias: body.ajuste_dias || 0,
        ciclo_total: body.ciclo_total || 60,
        targets_humidade: body.targets_humidade || 65
      }
      plantsDB.push(newPlant)
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ plant: newPlant, message: "Planta adicionada com sucesso" })
      }
    }

    // PUT - Atualizar planta
    if (event.httpMethod === "PUT" && plantId) {
      const index = plantsDB.findIndex(p => p.id === plantId)
      if (index === -1) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Planta não encontrada" })
        }
      }
      const body = JSON.parse(event.body || "{}")
      plantsDB[index] = { ...plantsDB[index], ...body }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ plant: plantsDB[index], message: "Planta atualizada" })
      }
    }

    // DELETE - Remover planta
    if (event.httpMethod === "DELETE" && plantId) {
      const index = plantsDB.findIndex(p => p.id === plantId)
      if (index === -1) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Planta não encontrada" })
        }
      }
      plantsDB.splice(index, 1)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "Planta removida com sucesso" })
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Método não permitido" })
    }

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `Erro interno: ${error.message}` })
    }
  }
}
