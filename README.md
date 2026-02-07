# myGarden 🌱

Aplicação web para gestão individual de plantas numa estufa vertical de 3 andares. Interface visual realista que imita tabuleiros de cultivo físicos.

## 🚀 Funcionalidades

- **Interface Visual Realista**: Tabuleiros de cultivo com textura de terra e plantas em crescimento
- **Sistema de Estágios**: 4 estágios de crescimento visualizados com sprites animados
- **3 Andares**: Gestão independente de cada andar da estufa
- **Integração eWeLink**: Leitura automática de sensores (humidade, temperatura, luz)
- **Calculadora de Rega**: Algoritmo que calcula ml de água necessários por planta
- **Notificações ntfy.sh**: Alertas push quando as plantas precisam de água
- **Lookup IA**: Obtenção automática de dados de ciclo de vida das plantas

## 🛠️ Stack Tecnológica

### Frontend
- **Vue.js 3** (Composition API)
- **Tailwind CSS**
- **Pinia** (State Management)
- **Vue Router**

### Backend
- **Python** (Netlify Functions - Serverless)
- **eWeLink API** (Sensores)
- **ntfy.sh** (Notificações)
- **OpenAI API** (Dados de plantas - opcional)

## 📁 Estrutura do Projeto

```
GardenGes/
├── src/
│   ├── components/
│   │   ├── TrayContainer.vue    # Contentor visual do tabuleiro
│   │   ├── PlantSlot.vue        # Slot individual com terra + sprite
│   │   └── AddPlantModal.vue    # Modal para adicionar plantas
│   ├── views/
│   │   ├── GreenhouseView.vue   # Vista geral dos 3 andares
│   │   └── FloorView.vue        # Vista detalhada de um andar
│   ├── stores/
│   │   └── greenhouse.js        # Estado global (Pinia)
│   └── router/
│       └── index.js
├── netlify/
│   └── functions/
│       ├── plants.py            # CRUD de plantas
│       ├── sensors.py           # Integração eWeLink
│       ├── ai-lookup.py         # Consulta IA para dados
│       └── calculate-watering.py # Cálculo de rega + ntfy
├── public/
│   └── assets/
│       └── sprites/             # Imagens das plantas (SVG/PNG)
└── netlify.toml
```

## 🎨 Sistema Visual

### Camadas do PlantSlot

1. **Camada de Terra**: Textura de fundo fixa simulando solo
2. **Sprite da Planta**: PNG/SVG transparente sobreposto
3. **UI de Interação**: Botões e info cards

### Estágios de Crescimento

| Estágio | Progresso | Descrição |
|---------|-----------|-----------|
| 🌱 1 | 0-25% | Rebento |
| 🌿 2 | 25-50% | Planta jovem |
| 🪴 3 | 50-75% | Planta adulta |
| 🌸 4 | 75-100% | Floração/Frutos |

## 🔧 Instalação

### 1. Clonar e Instalar

```bash
cd GardenGes
npm install
```

### 2. Configurar Variáveis de Ambiente

```bash
cp .env.example .env
# Editar .env com as suas credenciais
```

### 3. Executar em Desenvolvimento

```bash
# Frontend apenas
npm run dev

# Com Netlify Functions
npm run netlify
```

### 4. Deploy para Netlify

```bash
# Via Netlify CLI
netlify deploy --prod

# Ou conectar repo GitHub ao Netlify
```

## ⚙️ Configuração de Sensores (eWeLink)

1. Instalar sensores TH (temperatura/humidade) da Sonoff ou compatível
2. Configurar na app eWeLink
3. Nomear dispositivos com o padrão: `Sensor 1º Andar`, `Sensor 2º Andar`, etc.
4. Obter credenciais da API em [eWeLink Developer](https://coolkit-technologies.github.io/eWeLink-API/)

## 📱 Notificações (ntfy.sh)

1. Visitar [ntfy.sh](https://ntfy.sh/)
2. Criar um tópico único (ex: `gardenges-minha-estufa`)
3. Instalar app ntfy no telemóvel
4. Subscrever ao tópico
5. Adicionar `NTFY_TOPIC` ao `.env`

## 🌿 Modelo de Dados da Planta

```python
{
    "id": "string",
    "nome": "Manjericão",
    "andar": 1,
    "slot_index": 3,
    "data_inicio": "2026-01-15",
    "ajuste_dias": 0,
    "ciclo_total": 60,
    "targets_humidade": 65
}
```

## 📐 Fórmula de Rega

```
ml_necessários = (humidade_target - humidade_atual) × 2 / 0.55
```

Onde:
- `2` = Factor de conversão (ml por % de humidade)
- `0.55` = Volume padrão de uma gota (ml)

## 🎯 Roadmap

- [ ] Histórico de regas
- [ ] Gráficos de crescimento
- [ ] Múltiplas estufas
- [ ] Automação de rega via relés eWeLink
- [ ] App móvel nativa

## 📄 Licença

MIT License - Uso livre para projectos pessoais e comerciais.

---

Feito com 💚 para jardineiros tech-savvy
