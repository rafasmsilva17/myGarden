"""
GardenGes - Plants API
Netlify Function para gerir dados das plantas
"""

import json
import os
from datetime import datetime
from pathlib import Path

# Simular base de dados com ficheiro JSON
# Em produção, usar uma base de dados real (Supabase, PlanetScale, etc.)
DATA_FILE = Path("/tmp/plants_data.json")


def get_plants_data():
    """Carrega dados do ficheiro JSON"""
    if DATA_FILE.exists():
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"plants": []}


def save_plants_data(data):
    """Guarda dados no ficheiro JSON"""
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def generate_id():
    """Gera ID único baseado em timestamp"""
    return str(int(datetime.now().timestamp() * 1000))


def handler(event, context):
    """Handler principal da função Netlify"""
    
    # Headers CORS
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Content-Type": "application/json"
    }
    
    # Handle preflight
    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": headers,
            "body": ""
        }
    
    method = event.get("httpMethod", "GET")
    path = event.get("path", "")
    
    try:
        # GET /plants - Listar todas as plantas
        if method == "GET":
            data = get_plants_data()
            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps(data, ensure_ascii=False)
            }
        
        # POST /plants - Adicionar nova planta
        elif method == "POST":
            body = json.loads(event.get("body", "{}"))
            
            # Validar campos obrigatórios
            required_fields = ["nome", "andar", "slot_index", "data_inicio", "ciclo_total", "targets_humidade"]
            for field in required_fields:
                if field not in body:
                    return {
                        "statusCode": 400,
                        "headers": headers,
                        "body": json.dumps({"error": f"Campo obrigatório em falta: {field}"})
                    }
            
            # Criar nova planta
            new_plant = {
                "id": generate_id(),
                "nome": body["nome"],
                "andar": int(body["andar"]),
                "slot_index": int(body["slot_index"]),
                "data_inicio": body["data_inicio"],
                "ajuste_dias": int(body.get("ajuste_dias", 0)),
                "ciclo_total": int(body["ciclo_total"]),
                "targets_humidade": int(body["targets_humidade"]),
                "created_at": datetime.now().isoformat()
            }
            
            # Guardar
            data = get_plants_data()
            
            # Verificar se slot já está ocupado
            for plant in data["plants"]:
                if plant["andar"] == new_plant["andar"] and plant["slot_index"] == new_plant["slot_index"]:
                    return {
                        "statusCode": 409,
                        "headers": headers,
                        "body": json.dumps({"error": "Este slot já está ocupado"})
                    }
            
            data["plants"].append(new_plant)
            save_plants_data(data)
            
            return {
                "statusCode": 201,
                "headers": headers,
                "body": json.dumps({"plant": new_plant, "message": "Planta adicionada com sucesso"})
            }
        
        # PUT /plants/{id} - Atualizar planta
        elif method == "PUT":
            # Extrair ID do path
            path_parts = path.split("/")
            plant_id = path_parts[-1] if len(path_parts) > 0 else None
            
            if not plant_id:
                return {
                    "statusCode": 400,
                    "headers": headers,
                    "body": json.dumps({"error": "ID da planta não fornecido"})
                }
            
            body = json.loads(event.get("body", "{}"))
            data = get_plants_data()
            
            # Encontrar e atualizar planta
            plant_found = False
            for i, plant in enumerate(data["plants"]):
                if plant["id"] == plant_id:
                    # Atualizar apenas campos fornecidos
                    for key, value in body.items():
                        if key != "id":  # Não permitir alterar ID
                            data["plants"][i][key] = value
                    data["plants"][i]["updated_at"] = datetime.now().isoformat()
                    plant_found = True
                    updated_plant = data["plants"][i]
                    break
            
            if not plant_found:
                return {
                    "statusCode": 404,
                    "headers": headers,
                    "body": json.dumps({"error": "Planta não encontrada"})
                }
            
            save_plants_data(data)
            
            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps({"plant": updated_plant, "message": "Planta atualizada"})
            }
        
        # DELETE /plants/{id} - Remover planta
        elif method == "DELETE":
            path_parts = path.split("/")
            plant_id = path_parts[-1] if len(path_parts) > 0 else None
            
            if not plant_id:
                return {
                    "statusCode": 400,
                    "headers": headers,
                    "body": json.dumps({"error": "ID da planta não fornecido"})
                }
            
            data = get_plants_data()
            original_count = len(data["plants"])
            data["plants"] = [p for p in data["plants"] if p["id"] != plant_id]
            
            if len(data["plants"]) == original_count:
                return {
                    "statusCode": 404,
                    "headers": headers,
                    "body": json.dumps({"error": "Planta não encontrada"})
                }
            
            save_plants_data(data)
            
            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps({"message": "Planta removida com sucesso"})
            }
        
        else:
            return {
                "statusCode": 405,
                "headers": headers,
                "body": json.dumps({"error": "Método não permitido"})
            }
    
    except json.JSONDecodeError:
        return {
            "statusCode": 400,
            "headers": headers,
            "body": json.dumps({"error": "JSON inválido no body do request"})
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": f"Erro interno: {str(e)}"})
        }
