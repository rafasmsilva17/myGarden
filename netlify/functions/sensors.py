"""
GardenGes - Sensors API (eWeLink Integration)
Netlify Function para obter dados dos sensores via eWeLink API
"""

import json
import os
import requests
from datetime import datetime
import hashlib
import hmac
import base64
import time

# Configuração eWeLink
EWELINK_API_URL = "https://eu-apia.coolkit.cc"  # Servidor Europa
# Alternativas: cn-apia.coolkit.cc (China), us-apia.coolkit.cc (EUA)


def get_ewelink_token():
    """
    Obtém token de autenticação da eWeLink
    Requer EWELINK_EMAIL, EWELINK_PASSWORD e EWELINK_APP_ID nas env vars
    """
    email = os.environ.get("EWELINK_EMAIL")
    password = os.environ.get("EWELINK_PASSWORD")
    app_id = os.environ.get("EWELINK_APP_ID")
    app_secret = os.environ.get("EWELINK_APP_SECRET")
    
    if not all([email, password, app_id, app_secret]):
        return None
    
    try:
        # Timestamp em milissegundos
        ts = str(int(time.time() * 1000))
        
        # Criar assinatura
        sign_str = f"{app_id}_{ts}"
        signature = hmac.new(
            app_secret.encode(),
            sign_str.encode(),
            hashlib.sha256
        ).digest()
        sign = base64.b64encode(signature).decode()
        
        headers = {
            "Content-Type": "application/json",
            "X-CK-Appid": app_id,
            "X-CK-Nonce": ts[-8:],  # Últimos 8 dígitos
            "Authorization": f"Sign {sign}"
        }
        
        payload = {
            "email": email,
            "password": password,
            "countryCode": "+351"  # Portugal
        }
        
        response = requests.post(
            f"{EWELINK_API_URL}/v2/user/login",
            headers=headers,
            json=payload,
            timeout=10
        )
        
        data = response.json()
        if data.get("error") == 0:
            return data.get("data", {}).get("at")  # Access Token
        
        return None
        
    except Exception as e:
        print(f"Erro ao obter token eWeLink: {e}")
        return None


def get_ewelink_devices(token):
    """
    Obtém lista de dispositivos da conta eWeLink
    """
    if not token:
        return []
    
    app_id = os.environ.get("EWELINK_APP_ID")
    
    try:
        headers = {
            "Content-Type": "application/json",
            "X-CK-Appid": app_id,
            "Authorization": f"Bearer {token}"
        }
        
        response = requests.get(
            f"{EWELINK_API_URL}/v2/device/thing",
            headers=headers,
            timeout=10
        )
        
        data = response.json()
        if data.get("error") == 0:
            return data.get("data", {}).get("thingList", [])
        
        return []
        
    except Exception as e:
        print(f"Erro ao obter dispositivos: {e}")
        return []


def get_device_status(token, device_id):
    """
    Obtém status atual de um dispositivo específico
    """
    if not token:
        return None
    
    app_id = os.environ.get("EWELINK_APP_ID")
    
    try:
        headers = {
            "Content-Type": "application/json",
            "X-CK-Appid": app_id,
            "Authorization": f"Bearer {token}"
        }
        
        response = requests.get(
            f"{EWELINK_API_URL}/v2/device/thing/status",
            headers=headers,
            params={"type": 1, "id": device_id},
            timeout=10
        )
        
        data = response.json()
        if data.get("error") == 0:
            return data.get("data", {}).get("params", {})
        
        return None
        
    except Exception as e:
        print(f"Erro ao obter status do dispositivo: {e}")
        return None


def parse_sensor_data(devices, device_status_map):
    """
    Converte dados dos dispositivos eWeLink para formato da aplicação
    Usa IDs configurados nas variáveis de ambiente ou detecta por nome/tags
    """
    sensors = {
        1: {"humidity": 0, "temperature": 0, "light": 0},
        2: {"humidity": 0, "temperature": 0, "light": 0},
        3: {"humidity": 0, "temperature": 0, "light": 0}
    }
    
    # IDs configurados manualmente (têm prioridade)
    configured_devices = {
        1: os.environ.get("EWELINK_DEVICE_FLOOR_1", ""),
        2: os.environ.get("EWELINK_DEVICE_FLOOR_2", ""),
        3: os.environ.get("EWELINK_DEVICE_FLOOR_3", "")
    }
    
    for device in devices:
        device_id = device.get("itemData", {}).get("deviceid")
        name = device.get("itemData", {}).get("name", "").lower()
        tags = device.get("itemData", {}).get("tags", {})
        
        # Determinar andar: primeiro verifica IDs configurados
        floor = None
        for floor_num, configured_id in configured_devices.items():
            if configured_id and device_id == configured_id:
                floor = floor_num
                break
        
        # Se não configurado, tenta detectar pelo nome ou tags
        if not floor:
            for tag_name in ["floor_1", "floor_2", "floor_3", "andar_1", "andar_2", "andar_3"]:
                if tag_name in str(tags) or tag_name.replace("_", " ") in name:
                    floor = int(tag_name[-1])
                    break
        
        # Também verificar "1º andar", "2º andar", etc.
        if not floor:
            for i in [1, 2, 3]:
                if f"{i}º" in name or f"andar {i}" in name or f"floor {i}" in name:
                    floor = i
                    break
        
        if floor and device_id in device_status_map:
            status = device_status_map[device_id]
            
            # Sensores TH (temperatura/humidade)
            if "currentTemperature" in status:
                sensors[floor]["temperature"] = float(status.get("currentTemperature", 0))
            if "currentHumidity" in status:
                sensors[floor]["humidity"] = float(status.get("currentHumidity", 0))
            
            # Sensores de solo (alguns modelos)
            if "humidity" in status:
                sensors[floor]["humidity"] = float(status.get("humidity", 0))
            if "temperature" in status:
                sensors[floor]["temperature"] = float(status.get("temperature", 0))
            
            # Sensor de luz (se disponível)
            if "brightness" in status:
                sensors[floor]["light"] = int(status.get("brightness", 0))
            if "lux" in status:
                sensors[floor]["light"] = int(status.get("lux", 0))
    
    return sensors


def get_mock_sensor_data():
    """
    Dados mock para desenvolvimento/demo
    Simula variação realista dos sensores
    """
    import random
    
    base_time = int(time.time())
    
    return {
        1: {
            "humidity": 55 + random.randint(-5, 5) + (base_time % 10),
            "temperature": 23 + random.uniform(-1, 1),
            "light": 800 + random.randint(-100, 100)
        },
        2: {
            "humidity": 62 + random.randint(-5, 5) + ((base_time + 3) % 8),
            "temperature": 22 + random.uniform(-1, 1),
            "light": 720 + random.randint(-80, 80)
        },
        3: {
            "humidity": 58 + random.randint(-5, 5) + ((base_time + 5) % 12),
            "temperature": 24 + random.uniform(-1, 1),
            "light": 650 + random.randint(-50, 50)
        }
    }


def list_devices_handler(headers):
    """
    Lista todos os dispositivos da conta eWeLink
    Útil para descobrir os Device IDs a configurar
    """
    token = get_ewelink_token()
    
    if not token:
        return {
            "statusCode": 401,
            "headers": headers,
            "body": json.dumps({
                "error": "Não foi possível autenticar no eWeLink",
                "help": "Verifica EWELINK_EMAIL, EWELINK_PASSWORD, EWELINK_APP_ID e EWELINK_APP_SECRET"
            })
        }
    
    devices = get_ewelink_devices(token)
    
    if not devices:
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({
                "devices": [],
                "message": "Nenhum dispositivo encontrado na conta"
            })
        }
    
    # Formatar lista de dispositivos
    device_list = []
    for device in devices:
        item = device.get("itemData", {})
        device_id = item.get("deviceid", "")
        
        # Obter status atual
        status = get_device_status(token, device_id)
        
        device_list.append({
            "id": device_id,
            "name": item.get("name", "Sem nome"),
            "brand": item.get("brandName", ""),
            "model": item.get("productModel", ""),
            "online": item.get("online", False),
            "params": status or {},
            "config_example": f'EWELINK_DEVICE_FLOOR_X={device_id}'
        })
    
    return {
        "statusCode": 200,
        "headers": headers,
        "body": json.dumps({
            "devices": device_list,
            "total": len(device_list),
            "instructions": "Copia o ID do dispositivo para o .env no campo EWELINK_DEVICE_FLOOR_1, _2 ou _3"
        }, indent=2)
    }


def handler(event, context):
    """Handler principal da função Netlify"""
    
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Content-Type": "application/json"
    }
    
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}
    
    if event.get("httpMethod") != "GET":
        return {
            "statusCode": 405,
            "headers": headers,
            "body": json.dumps({"error": "Apenas GET é permitido"})
        }
    
    # Verificar se é pedido para listar dispositivos
    path = event.get("path", "")
    query = event.get("queryStringParameters") or {}
    
    if query.get("list") == "devices" or path.endswith("/devices"):
        return list_devices_handler(headers)
    
    try:
        # Tentar obter dados reais do eWeLink
        token = get_ewelink_token()
        
        if token:
            devices = get_ewelink_devices(token)
            
            if devices:
                # Obter status de cada dispositivo
                device_status_map = {}
                for device in devices:
                    device_id = device.get("itemData", {}).get("deviceid")
                    if device_id:
                        status = get_device_status(token, device_id)
                        if status:
                            device_status_map[device_id] = status
                
                sensors = parse_sensor_data(devices, device_status_map)
                
                return {
                    "statusCode": 200,
                    "headers": headers,
                    "body": json.dumps({
                        "sensors": sensors,
                        "source": "ewelink",
                        "timestamp": datetime.now().isoformat()
                    })
                }
        
        # Fallback para dados mock
        sensors = get_mock_sensor_data()
        
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({
                "sensors": sensors,
                "source": "mock",
                "timestamp": datetime.now().isoformat(),
                "note": "Dados simulados. Configure EWELINK_* env vars para dados reais."
            })
        }
        
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": f"Erro interno: {str(e)}"})
        }
