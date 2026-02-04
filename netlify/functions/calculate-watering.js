/**
 * myGarden - Watering Calculator API
 * Netlify Function para calcular necessidades de rega
 */

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

// Constantes de cálculo
const ML_PER_PERCENT = 2.0;  // ml de água por % de humidade a subir
const SPRAY_ML = 0.55;       // ml por spray de pulverizador

export const handler = async (event, context) => {
  // CORS preflight
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
    const { floor, plants, currentHumidity } = body;
    
    // Se não receber plantas, retornar array vazio
    if (!plants || !Array.isArray(plants)) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ recommendations: [] })
      };
    }

    const humidity = currentHumidity || 50;
    
    // Filtrar plantas do andar especificado (se fornecido)
    const floorPlants = floor 
      ? plants.filter(p => p.andar === parseInt(floor))
      : plants;

    // Calcular recomendações para cada planta
    const recommendations = floorPlants.map(plant => {
      const targetHumidity = plant.targets_humidade || 65;
      const diff = targetHumidity - humidity;

      if (diff <= 0) {
        return {
          plant_id: plant.id,
          plant_name: plant.nome,
          floor: plant.andar,
          current_humidity: humidity,
          target_humidity: targetHumidity,
          sprays_needed: 0,
          ml_needed: 0,
          status: "ok",
          message: "Humidade adequada"
        };
      }

      // Calcular quantidade de água necessária
      const mlNeeded = Math.round(diff * ML_PER_PERCENT);
      const spraysNeeded = Math.round(mlNeeded / SPRAY_ML);

      let status = "ok";
      let message = "Humidade adequada";

      if (diff > 10) {
        status = "needs_water";
        message = `Precisa de ~${spraysNeeded} sprays`;
      } else if (diff > 5) {
        status = "light_water";
        message = `Rega leve: ~${spraysNeeded} sprays`;
      }

      return {
        plant_id: plant.id,
        plant_name: plant.nome,
        floor: plant.andar,
        current_humidity: humidity,
        target_humidity: targetHumidity,
        sprays_needed: spraysNeeded,
        ml_needed: mlNeeded,
        status,
        message
      };
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ recommendations })
    };

  } catch (error) {
    console.error("Erro:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `Erro: ${error.message}` })
    };
  }
};
