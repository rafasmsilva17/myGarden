/**
 * GardenGes - AI Lookup API
 * Netlify Function para obter dados de plantas via IA (Groq)
 */

// Base de dados local de plantas
const PLANT_DATABASE = {
  "manjericão": { ciclo_total: 60, targets_humidade: 65, temperatura_ideal: "20-25°C", luz: "Sol direto, 6-8h", descricao: "O manjericão é uma erva aromática que prefere sol direto e solo húmido mas bem drenado." },
  "tomate": { ciclo_total: 90, targets_humidade: 70, temperatura_ideal: "20-28°C", luz: "Sol direto, 8h+", descricao: "Tomates precisam de muito sol e rega regular e profunda." },
  "tomate cherry": { ciclo_total: 80, targets_humidade: 68, temperatura_ideal: "18-26°C", luz: "Sol direto, 6-8h", descricao: "Variedade mais compacta e produtiva. Ideal para vasos e estufas." },
  "alface": { ciclo_total: 45, targets_humidade: 60, temperatura_ideal: "15-20°C", luz: "Sol parcial, 4-6h", descricao: "Alface cresce rapidamente em climas amenos." },
  "rúcula": { ciclo_total: 35, targets_humidade: 55, temperatura_ideal: "15-22°C", luz: "Sol parcial, 4-5h", descricao: "Planta de crescimento muito rápido, tolera alguma sombra." },
  "espinafre": { ciclo_total: 40, targets_humidade: 60, temperatura_ideal: "10-20°C", luz: "Sol parcial, 4-6h", descricao: "Prefere temperaturas amenas, bolt com calor." },
  "salsa": { ciclo_total: 75, targets_humidade: 60, temperatura_ideal: "15-22°C", luz: "Sol parcial a pleno, 4-6h", descricao: "Germinação lenta (2-3 semanas). Planta bienal." },
  "coentros": { ciclo_total: 50, targets_humidade: 55, temperatura_ideal: "15-25°C", luz: "Sol parcial, 4-5h", descricao: "Ciclo rápido, tende a florescer com calor." },
  "hortelã": { ciclo_total: 80, targets_humidade: 70, temperatura_ideal: "18-24°C", luz: "Sol parcial, 4-6h", descricao: "Muito invasiva, manter em vaso separado." },
  "cebolinho": { ciclo_total: 60, targets_humidade: 55, temperatura_ideal: "15-25°C", luz: "Sol pleno a parcial, 4-6h", descricao: "Perene, volta a crescer após corte." },
  "morango": { ciclo_total: 120, targets_humidade: 65, temperatura_ideal: "15-25°C", luz: "Sol direto, 6-8h", descricao: "Planta perene que produz por vários anos." },
  "pimento": { ciclo_total: 100, targets_humidade: 65, temperatura_ideal: "20-28°C", luz: "Sol direto, 6-8h", descricao: "Precisa de calor para produzir bem." },
  "pepino": { ciclo_total: 55, targets_humidade: 75, temperatura_ideal: "22-28°C", luz: "Sol direto, 6-8h", descricao: "Precisa de muita água e calor." },
  "couve": { ciclo_total: 65, targets_humidade: 60, temperatura_ideal: "15-22°C", luz: "Sol pleno a parcial, 4-6h", descricao: "Tolera frio, sabor melhora após geada leve." },
  "habanero": { ciclo_total: 120, targets_humidade: 60, temperatura_ideal: "24-32°C", luz: "Sol direto, 8h+", descricao: "Pimenta muito picante. Precisa de muito calor e sol." },
  "jalapeño": { ciclo_total: 85, targets_humidade: 60, temperatura_ideal: "20-30°C", luz: "Sol direto, 6-8h", descricao: "Pimenta versátil, picância média." },
  "carolina reaper": { ciclo_total: 140, targets_humidade: 55, temperatura_ideal: "25-35°C", luz: "Sol direto, 8h+", descricao: "A pimenta mais picante do mundo. Requer muito calor." },
  "aji limo": { ciclo_total: 95, targets_humidade: 65, temperatura_ideal: "22-30°C", luz: "Sol direto, 6-8h", descricao: "Pimenta peruana muito aromática e picante. Gosta de calor intenso." },
};

// Procurar na base de dados local
function findPlantData(plantName) {
  const name = plantName.toLowerCase().trim();
  
  if (PLANT_DATABASE[name]) {
    return PLANT_DATABASE[name];
  }
  
  // Procura parcial
  for (const [key, data] of Object.entries(PLANT_DATABASE)) {
    if (key.includes(name) || name.includes(key)) {
      return data;
    }
  }
  
  return null;
}

// Consultar Groq AI
async function getAIPlantData(plantName) {
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
            content: `És um especialista em horticultura. Quando te perguntarem sobre uma planta, 
responde APENAS com um JSON válido com esta estrutura exacta:
{
    "ciclo_total": <número de dias do ciclo de vida>,
    "targets_humidade": <percentagem ideal de humidade do solo>,
    "temperatura_ideal": "<range de temperatura em Celsius>",
    "luz": "<requisitos de luz>",
    "descricao": "<descrição breve com dicas de cultivo>"
}
Não incluas markdown, apenas o JSON puro.`
          },
          {
            role: "user",
            content: `Dados de cultivo para: ${plantName}`
          }
        ],
        temperature: 0.3
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
    
    // Primeiro, tentar base de dados local
    let plantData = findPlantData(plantName);
    let source = "database";
    
    // Se não encontrado localmente, tentar IA
    if (!plantData) {
      console.log(`Planta "${plantName}" não encontrada localmente, consultando IA...`);
      plantData = await getAIPlantData(plantName);
      source = "ai";
    }
    
    // Se ainda não encontrado, usar valores default
    if (!plantData) {
      plantData = {
        ciclo_total: 60,
        targets_humidade: 65,
        temperatura_ideal: "18-25°C",
        luz: "Sol parcial a pleno",
        descricao: `Dados genéricos para ${plantName}. Recomendamos pesquisar requisitos específicos desta planta.`
      };
      source = "default";
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ...plantData,
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
