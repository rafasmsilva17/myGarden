"""
GardenGes - Watering Calculator API
Netlify Function para calcular necessidades de rega e enviar notificações
"""

import json
import os
import requests
from datetime import datetime
from pathlib import Path

# Ficheiro de dados (mesmo usado por plants.py)
DATA_FILE = Path("/tmp/plants_data.json")

# Constantes de cálculo
ML_PER_PERCENT = 2.0  # ml de água por % de humidade a subir
DROPPER_ML = 0.55  # ml por gota (padrão)
SPRAY_ML = 0.55  # ml por spray de pulverizador


def get_plants_data():
    """Carrega dados das plantas"""
    if DATA_FILE.exists():
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"plants": []}


def get_mock_sensors():
    """Dados mock de sensores (quando eWeLink não disponível)"""
    import random
    return {
        1: {"humidity": 55 + random.randint(-5, 5), "temperature": 23},
        2: {"humidity": 62 + random.randint(-5, 5), "temperature": 22},
        3: {"humidity": 58 + random.randint(-5, 5), "temperature": 24}
    }


def get_sensor_data(floor):
    """
    Obtém dados dos sensores para um andar específico
    Em produção, isto chamaria a função sensors.py ou eWeLink directamente
    """
    # Por simplicidade, usar mock data aqui
    # Em produção, fazer request interno à função sensors
    sensors = get_mock_sensors()
    return sensors.get(floor, {"humidity": 50, "temperature": 22})


def calculate_watering_needs(plants, sensors):
    """
    Calcula necessidades de rega para cada planta
    Fórmula: (Target - Atual) * ML_PER_PERCENT / DROPPER_ML
    """
    recommendations = []
    
    for plant in plants:
        floor = plant.get("andar")
        sensor = sensors.get(floor, {})
        current_humidity = sensor.get("humidity", 50)
        target_humidity = plant.get("targets_humidade", 65)
        
        diff = target_humidity - current_humidity
        
        if diff <= 0:
            # Humidade adequada ou acima do target
            recommendations.append({
                "plant_id": plant["id"],
                "plant_name": plant["nome"],
                "floor": floor,
                "slot": plant.get("slot_index"),
                "current_humidity": current_humidity,
                "target_humidity": target_humidity,
                "difference": diff,
                "ml_needed": 0,
                "drops_needed": 0,
                "sprays_needed": 0,
                "status": "ok",
                "message": "Humidade adequada"
            })
        elif diff <= 5:
            # Ligeiramente abaixo, rega leve recomendada
            ml_needed = round((diff * ML_PER_PERCENT), 1)
            drops = round(ml_needed / DROPPER_ML)
            sprays = round(ml_needed / SPRAY_ML)
            recommendations.append({
                "plant_id": plant["id"],
                "plant_name": plant["nome"],
                "floor": floor,
                "slot": plant.get("slot_index"),
                "current_humidity": current_humidity,
                "target_humidity": target_humidity,
                "difference": diff,
                "ml_needed": ml_needed,
                "drops_needed": drops,
                "sprays_needed": sprays,
                "status": "light_water",
                "message": f"Rega leve: {sprays} spray(s) ({ml_needed}ml)"
            })
        else:
            # Precisa de rega significativa
            ml_needed = round((diff * ML_PER_PERCENT), 1)
            drops = round(ml_needed / DROPPER_ML)
            sprays = round(ml_needed / SPRAY_ML)
            recommendations.append({
                "plant_id": plant["id"],
                "plant_name": plant["nome"],
                "floor": floor,
                "slot": plant.get("slot_index"),
                "current_humidity": current_humidity,
                "target_humidity": target_humidity,
                "difference": diff,
                "ml_needed": ml_needed,
                "drops_needed": drops,
                "sprays_needed": sprays,
                "status": "needs_water",
                "message": f"Regar: {sprays} spray(s) ({ml_needed}ml)"
            })
    
    return recommendations


def send_ntfy_notification(recommendations):
    """
    Envia notificação via ntfy.sh para plantas que precisam de água
    Requer NTFY_TOPIC nas env vars
    """
    topic = os.environ.get("NTFY_TOPIC")
    
    if not topic:
        return {"sent": False, "reason": "NTFY_TOPIC não configurado"}
    
    # Filtrar plantas que precisam de água
    needs_water = [r for r in recommendations if r["status"] in ["needs_water", "light_water"]]
    
    if not needs_water:
        return {"sent": False, "reason": "Nenhuma planta precisa de água"}
    
    # Construir mensagem
    plants_list = "\n".join([
        f"• {r['plant_name']} ({r['floor']}º andar): {r['sprays_needed']} spray(s)"
        for r in needs_water
    ])
    
    total_sprays = sum(r['sprays_needed'] for r in needs_water)
    message = f"🌱 Rega Necessária\n\n{plants_list}\n\nTotal: {total_sprays} spray(s) em {len(needs_water)} planta(s)"
    
    try:
        response = requests.post(
            f"https://ntfy.sh/{topic}",
            data=message.encode('utf-8'),
            headers={
                "Title": "GardenGes - Alerta de Rega",
                "Priority": "high" if any(r["difference"] > 10 for r in needs_water) else "default",
                "Tags": "seedling,droplet"
            },
            timeout=10
        )
        
        if response.status_code == 200:
            return {"sent": True, "plants_notified": len(needs_water)}
        else:
            return {"sent": False, "reason": f"HTTP {response.status_code}"}
            
    except Exception as e:
        return {"sent": False, "reason": str(e)}


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
        floor_filter = body.get("floor")  # Opcional: filtrar por andar
        send_notification = body.get("notify", True)  # Por defeito, envia notificação
        
        # Obter plantas
        data = get_plants_data()
        plants = data.get("plants", [])
        
        if not plants:
            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps({
                    "recommendations": [],
                    "message": "Nenhuma planta registada"
                })
            }
        
        # Filtrar por andar se especificado
        if floor_filter:
            plants = [p for p in plants if p.get("andar") == int(floor_filter)]
        
        # Obter dados dos sensores
        sensors = get_mock_sensors()
        
        # Calcular necessidades de rega
        recommendations = calculate_watering_needs(plants, sensors)
        
        # Enviar notificação se solicitado e se houver plantas que precisam de água
        notification_result = None
        if send_notification:
            notification_result = send_ntfy_notification(recommendations)
        
        # Estatísticas
        total_plants = len(recommendations)
        needs_water = len([r for r in recommendations if r["status"] == "needs_water"])
        light_water = len([r for r in recommendations if r["status"] == "light_water"])
        ok_plants = len([r for r in recommendations if r["status"] == "ok"])
        total_ml = sum(r["ml_needed"] for r in recommendations)
        
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({
                "recommendations": recommendations,
                "summary": {
                    "total_plants": total_plants,
                    "needs_water": needs_water,
                    "light_water": light_water,
                    "ok": ok_plants,
                    "total_ml_needed": round(total_ml, 1)
                },
                "notification": notification_result,
                "timestamp": datetime.now().isoformat()
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
