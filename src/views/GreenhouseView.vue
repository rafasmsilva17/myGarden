<template>
  <div class="greenhouse-view">
    <h2 class="text-3xl font-bold text-white mb-8 text-center">
      🌿 Estufa Vertical - Visão Geral
    </h2>

    <!-- Painel do Sensor Global + Rega Recomendada -->
    <div class="global-sensor-panel">
      <div class="sensor-title">📡 Sensor da Estufa</div>
      <div class="sensor-readings">
        <div class="sensor-reading">
          <span class="sensor-icon">💧</span>
          <span class="sensor-label">Humidade:</span>
          <span class="sensor-value" :class="getHumidityClass(globalSensor.humidity)">{{ globalSensor.humidity }}%</span>
        </div>
        <div class="sensor-reading">
          <span class="sensor-icon">🌡️</span>
          <span class="sensor-label">Temperatura:</span>
          <span class="sensor-value">{{ globalSensor.temperature }}°C</span>
        </div>
        <div class="sensor-reading watering-recommendation" v-if="globalSpraysNeeded > 0">
          <span class="sensor-icon">🚿</span>
          <span class="sensor-label">Rega ideal:</span>
          <span class="sensor-value sprays-global">{{ globalSpraysNeeded }} spray{{ globalSpraysNeeded !== 1 ? 's' : '' }}</span>
        </div>
        <div class="sensor-reading watering-recommendation" v-else-if="totalPlants > 0">
          <span class="sensor-icon">✅</span>
          <span class="sensor-label">Rega:</span>
          <span class="sensor-value ok-global">OK</span>
        </div>
      </div>
      <div class="target-info" v-if="avgTargetHumidity > 0">
        Target médio: {{ avgTargetHumidity }}% ({{ totalPlants }} plantas)
      </div>
    </div>

    <!-- Acções Rápidas -->
    <div class="quick-actions">
      <router-link to="/plant-care" class="quick-action-btn">
        <span class="action-icon">🌿</span>
        <span class="action-text">Guia de Cuidados</span>
        <span class="action-desc">Informações detalhadas sobre cada planta</span>
      </router-link>
      <router-link to="/history" class="quick-action-btn">
        <span class="action-icon">📊</span>
        <span class="action-text">Histórico & Tendências</span>
        <span class="action-desc">Gráficos de temperatura e humidade</span>
      </router-link>
    </div>

    <!-- Estrutura da Estufa (3 andares) -->
    <div class="greenhouse-structure">
      <!-- Suporte metálico lateral esquerdo -->
      <div class="metal-frame metal-frame-left"></div>

      <!-- Andares -->
      <div class="floors-container">
        <div 
          v-for="floor in floors"
          :key="floor.number"
          class="floor-level"
          :class="`floor-${floor.number}`"
        >
          <!-- Etiqueta do Andar -->
          <div class="floor-label">
            <span class="floor-number">{{ floor.number }}º</span>
            <span class="floor-name">Andar</span>
          </div>

          <!-- Card do Andar -->
          <router-link 
            :to="`/floor/${floor.number}`"
            class="floor-card"
          >
            <!-- Preview do Tabuleiro -->
            <div class="floor-preview">
              <div class="mini-tray">
                <div 
                  v-for="slot in floor.slots"
                  :key="slot.index"
                  class="mini-slot"
                  :class="{ 'mini-slot--occupied': slot.plant }"
                >
                  <span v-if="slot.plant" class="mini-plant">
                    {{ getPlantEmoji(slot.plant) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Info do Andar -->
            <div class="floor-info">
              <div class="info-row">
                <span class="info-label">Plantas:</span>
                <span class="info-value">{{ floor.plantCount }}/{{ floor.totalSlots }}</span>
              </div>
              <div class="info-row" v-if="floor.avgTarget > 0">
                <span class="info-label">Target médio:</span>
                <span class="info-value">{{ floor.avgTarget }}%</span>
              </div>
            </div>

            <!-- Indicador de Alerta -->
            <div v-if="floor.hasAlert" class="floor-alert pulse-alert">
              ⚠️ Precisa rega
            </div>

            <!-- Botão Ver Detalhes -->
            <div class="floor-action">
              <span>Ver Tabuleiro</span>
              <span class="arrow">→</span>
            </div>
          </router-link>

          <!-- Suporte do Andar -->
          <div class="floor-shelf"></div>
        </div>
      </div>

      <!-- Suporte metálico lateral direito -->
      <div class="metal-frame metal-frame-right"></div>
    </div>

    <!-- Legenda -->
    <div class="legend">
      <h3 class="legend-title">Legenda de Estados</h3>
      <div class="legend-items">
        <div class="legend-item">
          <span class="legend-emoji">🌱</span>
          <span class="legend-text">Rebento</span>
        </div>
        <div class="legend-item">
          <span class="legend-emoji">🌿</span>
          <span class="legend-text">Jovem</span>
        </div>
        <div class="legend-item">
          <span class="legend-emoji">🪴</span>
          <span class="legend-text">Adulta</span>
        </div>
        <div class="legend-item">
          <span class="legend-emoji">🌸</span>
          <span class="legend-text">Floração</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGreenhouseStore } from '@/stores/greenhouse'

const store = useGreenhouseStore()

// Sensor global da estufa
const globalSensor = computed(() => store.sensor)

// Total de plantas
const totalPlants = computed(() => store.plants.length)

// Cálculo GLOBAL de sprays para toda a estufa (baseado na média de targets)
const avgTargetHumidity = computed(() => {
  const allPlants = store.plants
  if (allPlants.length === 0) return 0
  const totalTarget = allPlants.reduce((sum, p) => sum + p.targets_humidade, 0)
  return Math.round(totalTarget / allPlants.length)
})

const globalSpraysNeeded = computed(() => {
  const SPRAY_ML = 0.55
  const sensorData = store.sensor
  const targetAvg = avgTargetHumidity.value
  
  if (!sensorData || targetAvg === 0) return 0
  
  const diff = targetAvg - sensorData.humidity
  if (diff <= 0) return 0
  
  // Fórmula: diferença * 2ml / 0.55ml por spray
  const mlNeeded = Math.round(diff * 2)
  return Math.round(mlNeeded / SPRAY_ML)
})

// Dados dos andares
const floors = computed(() => {
  const sensorData = store.sensor
  
  return [3, 2, 1].map(num => {
    const floorPlants = store.getPlantsByFloor(num)
    const totalSlots = 12 // 6 colunas x 2 linhas
    
    // Criar array de slots
    const slots = Array.from({ length: totalSlots }, (_, i) => ({
      index: i,
      plant: floorPlants.find(p => p.slot_index === i) || null
    }))

    // Calcular target médio do andar
    const avgTarget = floorPlants.length > 0
      ? Math.round(floorPlants.reduce((sum, p) => sum + p.targets_humidade, 0) / floorPlants.length)
      : 0

    // Verificar se precisa de rega (alguma planta abaixo do target)
    const hasAlert = floorPlants.some(plant => {
      if (!sensorData) return false
      return sensorData.humidity < plant.targets_humidade - 5
    })

    return {
      number: num,
      slots,
      plantCount: floorPlants.length,
      totalSlots,
      avgTarget,
      hasAlert
    }
  })
})

// Emoji baseado no estágio da planta
const getPlantEmoji = (plant) => {
  if (!plant) return ''
  const start = new Date(plant.data_inicio)
  const now = new Date()
  const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + (plant.ajuste_dias || 0)
  const progress = (diffDays / plant.ciclo_total) * 100
  
  if (progress < 25) return '🌱'
  if (progress < 50) return '🌿'
  if (progress < 75) return '🪴'
  return '🌸'
}

// Classe de cor para humidade
const getHumidityClass = (humidity) => {
  if (humidity < 40) return 'text-red-400'
  if (humidity < 60) return 'text-yellow-400'
  return 'text-green-400'
}
</script>

<style scoped>
.greenhouse-view {
  padding: 20px;
}

/* Painel do Sensor Global */
.global-sensor-panel {
  max-width: 500px;
  margin: 0 auto 24px;
  padding: 16px 24px;
  background: linear-gradient(135deg, rgba(26,47,35,0.9) 0%, rgba(20,40,30,0.95) 100%);
  border: 1px solid rgba(34,139,34,0.4);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}

.sensor-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255,255,255,0.7);
  text-align: center;
  margin-bottom: 12px;
}

.sensor-readings {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.sensor-reading {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sensor-reading .sensor-icon {
  font-size: 20px;
}

.sensor-reading .sensor-label {
  color: rgba(255,255,255,0.6);
  font-size: 14px;
}

.sensor-reading .sensor-value {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

/* Recomendação de rega global */
.watering-recommendation {
  background: rgba(59, 130, 246, 0.2);
  padding: 8px 16px;
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  white-space: nowrap;
}

.watering-recommendation .sensor-label {
  white-space: nowrap;
}

.sprays-global {
  color: #60a5fa !important;
  font-size: 20px !important;
}

.ok-global {
  color: #4ade80 !important;
}

.target-info {
  text-align: center;
  margin-top: 12px;
  font-size: 12px;
  color: rgba(255,255,255,0.5);
}

/* Acções Rápidas */
.quick-actions {
  max-width: 500px;
  margin: 0 auto 24px;
  display: flex;
  gap: 12px;
}

.quick-action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px;
  background: linear-gradient(145deg, #2d5a43, #1e3a2d);
  border: 1px solid rgba(129, 199, 132, 0.3);
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.2s;
}

.quick-action-btn:hover {
  background: linear-gradient(145deg, #3a7056, #2d5a43);
  border-color: rgba(129, 199, 132, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
}

.action-icon {
  font-size: 1.5rem;
}

.action-text {
  color: #fff;
  font-weight: 600;
  font-size: 0.95rem;
}

.action-desc {
  color: rgba(165, 214, 167, 0.8);
  font-size: 0.75rem;
  text-align: center;
}

/* Estrutura da Estufa */
.greenhouse-structure {
  display: flex;
  justify-content: center;
  align-items: stretch;
  max-width: 900px;
  margin: 0 auto;
  min-height: 600px;
}

/* Frames Metálicos */
.metal-frame {
  width: 20px;
  background: linear-gradient(
    90deg,
    #5A6378 0%,
    #7A8498 50%,
    #5A6378 100%
  );
  border-radius: 4px;
  box-shadow: 
    inset -2px 0 4px rgba(0,0,0,0.3),
    2px 0 8px rgba(0,0,0,0.2);
}

.metal-frame-left {
  border-radius: 8px 0 0 8px;
}

.metal-frame-right {
  border-radius: 0 8px 8px 0;
}

/* Container dos Andares */
.floors-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  background: linear-gradient(
    180deg,
    rgba(74,85,104,0.1) 0%,
    rgba(74,85,104,0.05) 100%
  );
}

/* Nível do Andar */
.floor-level {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
}

/* Etiqueta do Andar */
.floor-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 60px;
  padding: 8px;
  background: rgba(74,85,104,0.3);
  border-radius: 8px;
}

.floor-number {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}

.floor-name {
  font-size: 11px;
  color: rgba(255,255,255,0.6);
  text-transform: uppercase;
}

/* Card do Andar */
.floor-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: rgba(26,47,35,0.8);
  border: 1px solid rgba(34,139,34,0.2);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
}

.floor-card:hover {
  background: rgba(26,47,35,0.95);
  border-color: rgba(34,139,34,0.5);
  transform: translateX(4px);
  box-shadow: 0 4px 20px rgba(34,139,34,0.2);
}

/* Preview do Tabuleiro */
.floor-preview {
  padding: 8px;
  background: #3D2B1F;
  border-radius: 6px;
  box-shadow: inset 0 2px 8px rgba(0,0,0,0.4);
}

.mini-tray {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 4px;
}

.mini-slot {
  aspect-ratio: 1;
  background: #4A3525;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.mini-slot--occupied {
  background: rgba(34,139,34,0.3);
}

/* Info do Andar */
.floor-info {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.info-row {
  display: flex;
  gap: 6px;
  font-size: 13px;
}

.info-label {
  color: rgba(255,255,255,0.5);
}

.info-value {
  color: #fff;
  font-weight: 600;
}

/* Sprays de rega */
.sprays-row {
  background: rgba(59, 130, 246, 0.15);
  padding: 4px 10px;
  border-radius: 8px;
  margin-left: auto;
}

.sprays-value {
  color: #60a5fa !important;
  font-weight: 700 !important;
}

.ok-value {
  color: #4ade80 !important;
  font-weight: 700 !important;
}

/* Alerta */
.floor-alert {
  padding: 6px 12px;
  background: rgba(239,68,68,0.2);
  border: 1px solid rgba(239,68,68,0.4);
  border-radius: 6px;
  color: #FCA5A5;
  font-size: 12px;
  font-weight: 600;
}

.pulse-alert {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* Ação */
.floor-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.1);
  color: #32CD32;
  font-size: 13px;
  font-weight: 600;
}

.arrow {
  transition: transform 0.3s ease;
}

.floor-card:hover .arrow {
  transform: translateX(4px);
}

/* Prateleira */
.floor-shelf {
  position: absolute;
  bottom: -8px;
  left: 60px;
  right: 0;
  height: 6px;
  background: linear-gradient(
    180deg,
    #5A6378 0%,
    #4A5368 100%
  );
  border-radius: 0 0 4px 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

/* Legenda */
.legend {
  margin-top: 40px;
  padding: 20px;
  background: rgba(74,85,104,0.1);
  border-radius: 12px;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

.legend-title {
  font-size: 14px;
  color: rgba(255,255,255,0.6);
  text-align: center;
  margin-bottom: 12px;
}

.legend-items {
  display: flex;
  justify-content: center;
  gap: 24px;
}

.legend-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.legend-emoji {
  font-size: 24px;
}

.legend-text {
  font-size: 11px;
  color: rgba(255,255,255,0.7);
}

/* Responsividade */
@media (max-width: 768px) {
  .greenhouse-view {
    padding: 12px;
  }
  
  .greenhouse-view h2 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }
  
  .global-sensor-panel {
    padding: 12px 16px;
    margin-bottom: 16px;
  }
  
  .sensor-readings {
    flex-direction: column;
    gap: 12px;
  }
  
  .greenhouse-structure {
    min-height: auto;
  }
  
  .metal-frame {
    width: 12px;
  }
  
  .floors-container {
    padding: 12px;
    gap: 16px;
  }
}

@media (max-width: 640px) {
  .floor-level {
    flex-direction: column;
    align-items: stretch;
  }
  
  .floor-label {
    flex-direction: row;
    justify-content: center;
    gap: 8px;
  }
  
  .floor-shelf {
    display: none;
  }
  
  .floor-card {
    padding: 12px;
  }
  
  .mini-slot {
    font-size: 12px;
  }
  
  .floor-info {
    flex-direction: column;
    gap: 8px;
  }
  
  .legend-items {
    gap: 16px;
    flex-wrap: wrap;
  }
  
  .legend-emoji {
    font-size: 20px;
  }
}

@media (max-width: 400px) {
  .metal-frame {
    display: none;
  }
  
  .floors-container {
    padding: 8px;
  }
  
  .mini-tray {
    gap: 2px;
  }
  
  .mini-slot {
    font-size: 10px;
  }
}
</style>
