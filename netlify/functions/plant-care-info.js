/**
 * GardenGes - Plant Care Info API
 * Netlify Function para obter informações detalhadas de cuidados com plantas via Groq AI
 */

// Consultar Groq AI para informações detalhadas
async function getPlantCareInfo(plantName) {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    console.log("GROQ_API_KEY não configurada");
    return null;
  }
  
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `És um especialista em horticultura e jardinagem. Quando te perguntarem sobre uma planta, fornece informações detalhadas e práticas em português de Portugal.

Responde APENAS com um JSON válido com esta estrutura exacta (sem markdown):
{
  "nome_cientifico": "<nome científico da planta>",
  "familia": "<família botânica>",
  "origem": "<região de origem>",
  "descricao": "<descrição geral da planta, 2-3 frases>",
  "beneficios": ["<benefício 1>", "<benefício 2>", "<benefício 3>"],
  "cuidados": {
    "rega": {
      "frequencia": "<frequência recomendada>",
      "quantidade": "<quantidade aproximada>",
      "dicas": "<dicas de rega específicas>"
    },
    "luz": {
      "tipo": "<tipo de luz ideal>",
      "horas": "<horas de luz por dia>",
      "dicas": "<dicas sobre exposição solar>"
    },
    "solo": {
      "tipo": "<tipo de solo recomendado>",
      "ph": "<pH ideal>",
      "drenagem": "<requisitos de drenagem>"
    },
    "temperatura": {
      "ideal": "<temperatura ideal em °C>",
      "minima": "<temperatura mínima tolerada>",
      "maxima": "<temperatura máxima tolerada>"
    },
    "humidade": {
      "ideal": "<humidade do ar ideal em %>",
      "dicas": "<dicas para manter humidade adequada>"
    },
    "fertilizacao": {
      "frequencia": "<frequência de fertilização>",
      "tipo": "<tipo de fertilizante recomendado>",
      "epoca": "<melhor época para fertilizar>"
    }
  },
  "pragas_doencas": [
    {"nome": "<praga/doença comum>", "prevencao": "<como prevenir>"}
  ],
  "colheita": {
    "tempo": "<tempo até colheita>",
    "sinais": "<sinais de maturidade>",
    "metodo": "<como colher correctamente>"
  },
  "dicas_extras": ["<dica extra 1>", "<dica extra 2>", "<dica extra 3>"],
  "curiosidades": ["<curiosidade 1>", "<curiosidade 2>"]
}

Não incluas markdown, código de formatação ou texto adicional. Apenas o JSON puro.`
          },
          {
            role: "user",
            content: `Fornece informações completas de cuidados para a planta: ${plantName}`
          }
        ],
        temperature: 0.4,
        max_tokens: 2000
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      let result = data.choices?.[0]?.message?.content || "";
      
      // Limpar markdown se existir
      result = result.trim();
      if (result.startsWith("```")) {
        result = result.split("```")[1];
        if (result.startsWith("json")) {
          result = result.substring(4);
        }
      }
      if (result.endsWith("```")) {
        result = result.slice(0, -3);
      }
      result = result.trim();
      
      return JSON.parse(result);
    } else {
      console.log(`Groq API error: ${response.status} - ${await response.text()}`);
      return null;
    }
  } catch (error) {
    console.log(`Erro ao consultar Groq: ${error.message}`);
    return null;
  }
}

// Dados default quando IA não está disponível
function getDefaultPlantInfo(plantName) {
  return {
    nome_cientifico: "Não disponível",
    familia: "Não disponível",
    origem: "Não disponível",
    descricao: `Informações sobre ${plantName}. Para dados mais detalhados, verifique se a chave GROQ_API_KEY está configurada.`,
    beneficios: ["Rico em nutrientes", "Fácil de cultivar", "Versátil na cozinha"],
    cuidados: {
      rega: {
        frequencia: "2-3 vezes por semana",
        quantidade: "Moderada",
        dicas: "Verificar humidade do solo antes de regar"
      },
      luz: {
        tipo: "Sol parcial a pleno",
        horas: "4-6 horas",
        dicas: "Evitar sol forte nas horas mais quentes"
      },
      solo: {
        tipo: "Rico em matéria orgânica",
        ph: "6.0-7.0",
        drenagem: "Boa drenagem é essencial"
      },
      temperatura: {
        ideal: "18-25°C",
        minima: "10°C",
        maxima: "30°C"
      },
      humidade: {
        ideal: "60-70%",
        dicas: "Pulverizar folhas em dias secos"
      },
      fertilizacao: {
        frequencia: "A cada 2-3 semanas",
        tipo: "Fertilizante equilibrado",
        epoca: "Primavera e verão"
      }
    },
    pragas_doencas: [
      { nome: "Pulgões", prevencao: "Inspecionar regularmente" },
      { nome: "Oídio", prevencao: "Boa circulação de ar" }
    ],
    colheita: {
      tempo: "Varia conforme a planta",
      sinais: "Verificar maturidade visual",
      metodo: "Colher com cuidado para não danificar a planta"
    },
    dicas_extras: [
      "Rotacionar posição para crescimento uniforme",
      "Remover folhas amareladas",
      "Manter espaçamento adequado"
    ],
    curiosidades: [
      "Cada planta tem necessidades únicas",
      "A observação regular é a chave do sucesso"
    ]
  };
}

// Handler principal
export const handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };
  
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }
  
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Apenas POST é permitido" })
    };
  }
  
  try {
    const body = JSON.parse(event.body || "{}");
    const plantName = (body.name || "").trim();
    
    if (!plantName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Nome da planta é obrigatório" })
      };
    }
    
    // Tentar obter dados da IA
    let plantInfo = await getPlantCareInfo(plantName);
    let source = "ai";
    
    // Se IA falhou, usar dados default
    if (!plantInfo) {
      plantInfo = getDefaultPlantInfo(plantName);
      source = "default";
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ...plantInfo,
        source,
        plant_name: plantName
      })
    };
    
  } catch (error) {
    console.log(`Erro: ${error.message}`);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `Erro interno: ${error.message}` })
    };
  }
};
