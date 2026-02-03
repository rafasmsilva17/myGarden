"""
GardenGes - AI Lookup API
Netlify Function para obter dados de plantas via IA
"""

import json
import os
from datetime import datetime

# Dados pré-definidos de plantas comuns (fallback se IA não disponível)
PLANT_DATABASE = {
    "manjericão": {
        "ciclo_total": 60,
        "targets_humidade": 65,
        "temperatura_ideal": "20-25°C",
        "luz": "Sol direto, 6-8h",
        "descricao": "O manjericão é uma erva aromática que prefere sol direto e solo húmido mas bem drenado. Evitar regar as folhas para prevenir doenças fúngicas. Podar regularmente para estimular crescimento compacto."
    },
    "tomate": {
        "ciclo_total": 90,
        "targets_humidade": 70,
        "temperatura_ideal": "20-28°C",
        "luz": "Sol direto, 8h+",
        "descricao": "Tomates precisam de muito sol e rega regular e profunda. Suporte (tutores) necessário quando crescer. Remover rebentos laterais para maior produção. Regar na base, não nas folhas."
    },
    "tomate cherry": {
        "ciclo_total": 80,
        "targets_humidade": 68,
        "temperatura_ideal": "18-26°C",
        "luz": "Sol direto, 6-8h",
        "descricao": "Variedade mais compacta e produtiva. Ideal para vasos e estufas. Produz frutos em cachos. Muito saborosos quando colhidos maduros na planta."
    },
    "alface": {
        "ciclo_total": 45,
        "targets_humidade": 60,
        "temperatura_ideal": "15-20°C",
        "luz": "Sol parcial, 4-6h",
        "descricao": "Alface cresce rapidamente em climas amenos. Colher folhas externas primeiro para prolongar colheita. Evitar sol intenso que causa bolting (floração prematura)."
    },
    "rúcula": {
        "ciclo_total": 35,
        "targets_humidade": 55,
        "temperatura_ideal": "15-22°C",
        "luz": "Sol parcial, 4-5h",
        "descricao": "Planta de crescimento muito rápido, tolera alguma sombra. Sabor mais picante com calor. Semear em sucessão para colheita contínua."
    },
    "espinafre": {
        "ciclo_total": 40,
        "targets_humidade": 60,
        "temperatura_ideal": "10-20°C",
        "luz": "Sol parcial, 4-6h",
        "descricao": "Prefere temperaturas amenas, bolt com calor. Muito nutritivo. Colher folhas externas ou cortar toda a planta a 3cm do solo para rebrote."
    },
    "salsa": {
        "ciclo_total": 75,
        "targets_humidade": 60,
        "temperatura_ideal": "15-22°C",
        "luz": "Sol parcial a pleno, 4-6h",
        "descricao": "Germinação lenta (2-3 semanas). Planta bienal, produz folhas no primeiro ano. Colher folhas externas regularmente. Tolera algum frio."
    },
    "coentros": {
        "ciclo_total": 50,
        "targets_humidade": 55,
        "temperatura_ideal": "15-25°C",
        "luz": "Sol parcial, 4-5h",
        "descricao": "Ciclo rápido, tende a florescer com calor. Semear a cada 2-3 semanas para colheita contínua. As sementes (coentro seco) também são utilizáveis."
    },
    "hortelã": {
        "ciclo_total": 80,
        "targets_humidade": 70,
        "temperatura_ideal": "18-24°C",
        "luz": "Sol parcial, 4-6h",
        "descricao": "Muito invasiva, manter em vaso separado ou com barreiras. Gosta de humidade constante. Podar regularmente para manter compacta e aromática."
    },
    "cebolinho": {
        "ciclo_total": 60,
        "targets_humidade": 55,
        "temperatura_ideal": "15-25°C",
        "luz": "Sol pleno a parcial, 4-6h",
        "descricao": "Perene, volta a crescer após corte. Cortar a 5cm do solo. Flores são comestíveis. Muito resistente e fácil de cultivar."
    },
    "morango": {
        "ciclo_total": 120,
        "targets_humidade": 65,
        "temperatura_ideal": "15-25°C",
        "luz": "Sol direto, 6-8h",
        "descricao": "Planta perene que produz por vários anos. Produz estolões que podem ser replantados. Mulching ajuda a manter frutos limpos e humidade."
    },
    "pimento": {
        "ciclo_total": 100,
        "targets_humidade": 65,
        "temperatura_ideal": "20-28°C",
        "luz": "Sol direto, 6-8h",
        "descricao": "Precisa de calor para produzir bem. Suporte pode ser necessário com frutos pesados. Colher quando atingir cor desejada."
    },
    "aji limo": {
        "ciclo_total": 95,
        "targets_humidade": 65,
        "temperatura_ideal": "22-30°C",
        "luz": "Sol direto, 6-8h",
        "descricao": "Pimenta peruana muito aromática e picante. Gosta de calor intenso. Colher quando amarelo-alaranjado. Usado em ceviches e molhos. Rica em vitamina C."
    },
    "pepino": {
        "ciclo_total": 55,
        "targets_humidade": 75,
        "temperatura_ideal": "22-28°C",
        "luz": "Sol direto, 6-8h",
        "descricao": "Precisa de muita água e calor. Trepadeira, beneficia de suporte vertical. Colher jovens para melhor sabor e mais produção."
    },
    "couve": {
        "ciclo_total": 65,
        "targets_humidade": 60,
        "temperatura_ideal": "15-22°C",
        "luz": "Sol pleno a parcial, 4-6h",
        "descricao": "Tolera frio, sabor melhora após geada leve. Variedades incluem couve-galega, couve-de-bruxelas, etc. Vigilar pragas."
    },
    "agrião": {
        "ciclo_total": 30,
        "targets_humidade": 80,
        "temperatura_ideal": "12-20°C",
        "luz": "Sol parcial, 3-5h",
        "descricao": "Adora humidade, pode crescer em água. Crescimento muito rápido. Colher antes da floração para melhor sabor. Rico em vitaminas."
    },
    "orégãos": {
        "ciclo_total": 85,
        "targets_humidade": 45,
        "temperatura_ideal": "18-28°C",
        "luz": "Sol pleno, 6-8h",
        "descricao": "Planta mediterrânica, prefere solo seco e bem drenado. Perene e resistente. Secar folhas para usar durante o inverno."
    },
    # Pimentos picantes
    "habanero": {
        "ciclo_total": 120,
        "targets_humidade": 60,
        "temperatura_ideal": "24-32°C",
        "luz": "Sol pleno, 8h+",
        "descricao": "Pimento muito picante (100k-350k Scoville). Necessita calor intenso e sol pleno. Germinar a 28-30°C. Regar moderadamente, evitar encharcamento."
    },
    "jalapeño": {
        "ciclo_total": 90,
        "targets_humidade": 65,
        "temperatura_ideal": "22-28°C",
        "luz": "Sol pleno, 6-8h",
        "descricao": "Pimento picante médio (2.5k-8k Scoville). Muito produtivo. Colher verde ou vermelho maduro. Ideal para iniciantes."
    },
    "jalapeno": {
        "ciclo_total": 90,
        "targets_humidade": 65,
        "temperatura_ideal": "22-28°C",
        "luz": "Sol pleno, 6-8h",
        "descricao": "Pimento picante médio (2.5k-8k Scoville). Muito produtivo. Colher verde ou vermelho maduro. Ideal para iniciantes."
    },
    "carolina reaper": {
        "ciclo_total": 130,
        "targets_humidade": 60,
        "temperatura_ideal": "24-32°C",
        "luz": "Sol pleno, 8h+",
        "descricao": "O pimento mais picante do mundo! (1.5M-2.2M Scoville). Requer muito calor e paciência. Usar luvas ao manusear."
    },
    "cayenne": {
        "ciclo_total": 85,
        "targets_humidade": 60,
        "temperatura_ideal": "21-29°C",
        "luz": "Sol pleno, 6-8h",
        "descricao": "Pimento picante versátil (30k-50k Scoville). Fácil de secar. Muito usado em pó. Produtivo em climas quentes."
    },
    "piri-piri": {
        "ciclo_total": 95,
        "targets_humidade": 60,
        "temperatura_ideal": "22-30°C",
        "luz": "Sol pleno, 6-8h",
        "descricao": "Pimento africano picante (50k-175k Scoville). Resistente ao calor. Popular em Portugal. Plantas compactas."
    },
    "piri piri": {
        "ciclo_total": 95,
        "targets_humidade": 60,
        "temperatura_ideal": "22-30°C",
        "luz": "Sol pleno, 6-8h",
        "descricao": "Pimento africano picante (50k-175k Scoville). Resistente ao calor. Popular em Portugal. Plantas compactas."
    },
    "malagueta": {
        "ciclo_total": 90,
        "targets_humidade": 60,
        "temperatura_ideal": "22-30°C",
        "luz": "Sol pleno, 6-8h",
        "descricao": "Pimento brasileiro picante (60k-100k Scoville). Plantas produtivas. Frutos pequenos e alongados."
    },
    "ghost pepper": {
        "ciclo_total": 125,
        "targets_humidade": 60,
        "temperatura_ideal": "24-32°C",
        "luz": "Sol pleno, 8h+",
        "descricao": "Bhut Jolokia, extremamente picante (1M Scoville). Originário da Índia. Requer calor intenso para amadurecer."
    },
    "bhut jolokia": {
        "ciclo_total": 125,
        "targets_humidade": 60,
        "temperatura_ideal": "24-32°C",
        "luz": "Sol pleno, 8h+",
        "descricao": "Ghost Pepper, extremamente picante (1M Scoville). Originário da Índia. Requer calor intenso."
    },
    "scotch bonnet": {
        "ciclo_total": 110,
        "targets_humidade": 65,
        "temperatura_ideal": "24-30°C",
        "luz": "Sol pleno, 6-8h",
        "descricao": "Pimento caribenho (100k-350k Scoville). Sabor frutado distintivo. Essencial na culinária jamaicana."
    },
    "tabasco": {
        "ciclo_total": 100,
        "targets_humidade": 65,
        "temperatura_ideal": "22-30°C",
        "luz": "Sol pleno, 6-8h",
        "descricao": "Famoso pelo molho. Pimentos pequenos e muito picantes (30k-50k Scoville). Muito produtivo."
    },
    "serrano": {
        "ciclo_total": 85,
        "targets_humidade": 65,
        "temperatura_ideal": "21-29°C",
        "luz": "Sol pleno, 6-8h",
        "descricao": "Pimento mexicano (10k-25k Scoville). Mais picante que jalapeño. Ideal fresco em salsas."
    },
    "poblano": {
        "ciclo_total": 95,
        "targets_humidade": 65,
        "temperatura_ideal": "21-28°C",
        "luz": "Sol pleno, 6-8h",
        "descricao": "Pimento suave mexicano (1k-2k Scoville). Seco chama-se ancho. Ideal para chiles rellenos."
    },
    "thai chili": {
        "ciclo_total": 90,
        "targets_humidade": 60,
        "temperatura_ideal": "24-30°C",
        "luz": "Sol pleno, 6-8h",
        "descricao": "Pimento asiático pequeno mas muito picante (50k-100k Scoville). Plantas muito produtivas."
    },
    # Outras plantas
    "cenoura": {
        "ciclo_total": 75,
        "targets_humidade": 65,
        "temperatura_ideal": "15-20°C",
        "luz": "Sol pleno a parcial, 6h",
        "descricao": "Solo solto e profundo sem pedras. Desbastar para cenouras maiores. Manter solo húmido."
    },
    "beterraba": {
        "ciclo_total": 60,
        "targets_humidade": 70,
        "temperatura_ideal": "15-22°C",
        "luz": "Sol pleno a parcial, 4-6h",
        "descricao": "Raiz e folhas comestíveis. Solo solto. Colher quando 5-7cm de diâmetro."
    },
    "rabanete": {
        "ciclo_total": 30,
        "targets_humidade": 70,
        "temperatura_ideal": "12-20°C",
        "luz": "Sol parcial, 4-6h",
        "descricao": "O mais rápido da horta! Pronto em 4 semanas. Semear em sucessão. Evitar calor."
    }
}


def find_plant_data(plant_name):
    """Procura dados da planta na base de dados local"""
    name_lower = plant_name.lower().strip()
    
    # Procura exacta
    if name_lower in PLANT_DATABASE:
        return PLANT_DATABASE[name_lower]
    
    # Procura parcial
    for key, data in PLANT_DATABASE.items():
        if key in name_lower or name_lower in key:
            return data
    
    return None


def get_ai_plant_data(plant_name):
    """
    Consulta IA para obter dados da planta
    Usa Groq - API gratuita
    """
    import requests
    
    # Verificar se temos API key configurada
    api_key = os.environ.get("GROQ_API_KEY")
    
    if not api_key:
        return None
    
    try:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {
                    "role": "system",
                    "content": """És um especialista em horticultura. Quando te perguntarem sobre uma planta, 
responde APENAS com um JSON válido com esta estrutura exacta:
{
    "ciclo_total": <número de dias do ciclo de vida>,
    "targets_humidade": <percentagem ideal de humidade do solo>,
    "temperatura_ideal": "<range de temperatura em Celsius>",
    "luz": "<requisitos de luz>",
    "descricao": "<descrição breve com dicas de cultivo>"
}
Não incluas markdown, apenas o JSON puro."""
                },
                {
                    "role": "user",
                    "content": f"Dados de cultivo para: {plant_name}"
                }
            ],
            "temperature": 0.3
        }
        
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            result = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            # Limpar possíveis marcadores de código
            result = result.strip()
            if result.startswith("```"):
                result = result.split("```")[1]
                if result.startswith("json"):
                    result = result[4:]
            result = result.strip()
            
            return json.loads(result)
        elif response.status_code == 403:
            print(f"Groq API - sem permissões: {response.text}")
            return None
        
        print(f"Groq API error: {response.status_code} - {response.text}")
        return None
        
    except Exception as e:
        print(f"Erro ao consultar Groq: {e}")
        return None


def handler(event, context):
    """Handler principal da função Netlify"""
    
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Content-Type": "application/json"
    }
    
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}
    
    if event.get("httpMethod") != "POST":
        return {
            "statusCode": 405,
            "headers": headers,
            "body": json.dumps({"error": "Apenas POST é permitido"})
        }
    
    try:
        body = json.loads(event.get("body", "{}"))
        plant_name = body.get("name", "").strip()
        
        if not plant_name:
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({"error": "Nome da planta é obrigatório"})
            }
        
        # Primeiro, tentar base de dados local
        plant_data = find_plant_data(plant_name)
        source = "database"
        
        # Se não encontrado localmente, tentar IA
        if not plant_data:
            plant_data = get_ai_plant_data(plant_name)
            source = "ai"
        
        # Se ainda não encontrado, usar valores default
        if not plant_data:
            plant_data = {
                "ciclo_total": 60,
                "targets_humidade": 65,
                "temperatura_ideal": "18-25°C",
                "luz": "Sol parcial a pleno",
                "descricao": f"Dados genéricos para {plant_name}. Recomendamos pesquisar requisitos específicos desta planta."
            }
            source = "default"
        
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({
                **plant_data,
                "source": source,
                "plant_name": plant_name
            }, ensure_ascii=False)
        }
        
    except json.JSONDecodeError:
        return {
            "statusCode": 400,
            "headers": headers,
            "body": json.dumps({"error": "JSON inválido"})
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": f"Erro interno: {str(e)}"})
        }
