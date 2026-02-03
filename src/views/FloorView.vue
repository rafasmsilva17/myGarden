<template>
  <div class="floor-view">
    <!-- Navegação -->
    <div class="nav-header">
      <router-link to="/" class="back-button">
        <span>←</span>
        <span>Voltar</span>
      </router-link>
      
      <div class="floor-nav">
        <button 
          v-for="n in 3" 
          :key="n"
          @click="navigateToFloor(n)"
          :class="['nav-btn', { 'nav-btn--active': currentFloor === n }]"
        >
          {{ n }}º Andar
        </button>
      </div>
    </div>

    <!-- Título e Sensores -->
    <div class="floor-header">
      <h2 class="floor-title">
        🌱 {{ currentFloor }}º Andar - Tabuleiro de Cultivo
      </h2>
      
      <!-- Dados do Sensor da Estufa -->
      <div class="sensor-panel">
        <div class="sensor-panel-title">📡 Sensor da Estufa</div>
        <div class="sensor-item">
          <span class="sensor-icon">💧</span>
          <div class="sensor-data">
            <span class="sensor-label">Humidade</span>
            <span class="sensor-value" :class="humidityClass">
              {{ sensorData.humidity }}%
            </span>
          </div>
          <div class="sensor-bar">
            <div 
              class="sensor-bar-fill humidity-bar"
              :style="{ width: `${sensorData.humidity}%` }"
            ></div>
          </div>
        </div>
        
        <div class="sensor-item">
          <span class="sensor-icon">🌡️</span>
          <div class="sensor-data">
            <span class="sensor-label">Temperatura</span>
            <span class="sensor-value">{{ sensorData.temperature }}°C</span>
          </div>
        </div>

        <button 
          class="water-calc-btn"
          @click="calculateWatering"
          :disabled="isCalculating"
        >
          <span v-if="!isCalculating">💧 Calcular Rega</span>
          <span v-else>⏳ A calcular...</span>
        </button>
      </div>
    </div>

    <!-- Resultado do Cálculo de Rega -->
    <div v-if="wateringResult" class="watering-result">
      <div class="result-header">
        <span class="result-icon">💧</span>
        <h3>Recomendação de Rega</h3>
      </div>
      <div class="result-content">
        <div v-for="rec in wateringResult" :key="rec.plant_id" class="rec-item">
          <span class="rec-name">{{ rec.plant_name }}</span>
          <span class="rec-amount">{{ rec.ml_needed }} ml</span>
          <span class="rec-status" :class="rec.status">{{ rec.message }}</span>
        </div>
      </div>
      <button @click="wateringResult = null" class="close-result">Fechar</button>
    </div>

    <!-- Tabuleiro Principal -->
    <div class="tray-wrapper">
      <TrayContainer :columns="6" :rows="2">
        <PlantSlot
          v-for="index in 12"
          :key="index - 1"
          :slot-index="index - 1"
          :floor-number="currentFloor"
          :plant="getPlantAtSlot(index - 1)"
        />
      </TrayContainer>
    </div>

    <!-- Estatísticas do Andar -->
    <div class="floor-stats">
      <div class="stat-card">
        <span class="stat-number">{{ occupiedSlots }}</span>
        <span class="stat-label">Plantas</span>
      </div>
      <div class="stat-card">
        <span class="stat-number">{{ emptySlots }}</span>
        <span class="stat-label">Vazios</span>
      </div>
      <div class="stat-card">
        <span class="stat-number">{{ averageProgress }}%</span>
        <span class="stat-label">Progresso Médio</span>
      </div>
      <div class="stat-card" :class="{ 'stat-card--alert': needsWatering }">
        <span class="stat-number">{{ needsWatering ? '⚠️' : '✅' }}</span>
        <span class="stat-label">{{ needsWatering ? 'Precisa Rega' : 'Rega OK' }}</span>
      </div>
    </div>

    <!-- Lista de Plantas -->
    <div class="plants-list">
      <h3 class="list-title">🌿 Plantas neste Andar</h3>
      <div v-if="floorPlants.length === 0" class="empty-message">
        Nenhuma planta neste andar. Clique num slot vazio para adicionar!
      </div>
      <div v-else class="plants-grid">
        <div 
          v-for="plant in floorPlants" 
          :key="plant.id"
          class="plant-card"
          @click="selectPlant(plant)"
        >
          <div class="plant-card-header">
            <span class="plant-emoji">{{ getStageEmoji(plant) }}</span>
            <span class="plant-name">{{ plant.nome }}</span>
          </div>
          <div class="plant-card-body">
            <div class="plant-detail">
              <span class="detail-label">Slot:</span>
              <span class="detail-value">#{{ plant.slot_index + 1 }}</span>
            </div>
            <div class="plant-detail">
              <span class="detail-label">Dia:</span>
              <span class="detail-value">{{ getDaysElapsed(plant) }}/{{ plant.ciclo_total }}</span>
            </div>
            <div class="plant-detail">
              <span class="detail-label">Target:</span>
              <span class="detail-value">{{ plant.targets_humidade }}%</span>
            </div>
          </div>
          <div class="plant-progress">
            <div 
              class="progress-fill"
              :style="{ width: `${getProgress(plant)}%` }"
            ></div>
          </div>
          <button 
            class="remove-btn"
            @click.stop="removePlant(plant)"
          >
            🗑️ Remover
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGreenhouseStore } from '@/stores/greenhouse'
import TrayContainer from '@/components/TrayContainer.vue'
import PlantSlot from '@/components/PlantSlot.vue'

const route = useRoute()
const router = useRouter()
const store = useGreenhouseStore()

const isCalculating = ref(false)
const wateringResult = ref(null)

// Andar atual
const currentFloor = computed(() => {
  return parseInt(route.params.floorNumber) || 1
})

// Dados do sensor (sensor global da estufa)
const sensorData = computed(() => {
  return store.sensor || {
    humidity: 0,
    temperature: 0
  }
})

// Classe de cor para humidade
const humidityClass = computed(() => {
  const h = sensorData.value.humidity
  if (h < 40) return 'text-red-400'
  if (h < 60) return 'text-yellow-400'
  return 'text-green-400'
})

// Plantas do andar
const floorPlants = computed(() => {
  return store.getPlantsByFloor(currentFloor.value)
})

// Estatísticas
const occupiedSlots = computed(() => floorPlants.value.length)
const emptySlots = computed(() => 12 - occupiedSlots.value)

const averageProgress = computed(() => {
  if (floorPlants.value.length === 0) return 0
  const total = floorPlants.value.reduce((sum, p) => sum + getProgress(p), 0)
  return Math.round(total / floorPlants.value.length)
})

const needsWatering = computed(() => {
  return floorPlants.value.some(plant => {
    return sensorData.value.humidity < plant.targets_humidade - 5
  })
})

// Obter planta em slot específico
const getPlantAtSlot = (index) => {
  return floorPlants.value.find(p => p.slot_index === index) || null
}

// Dias decorridos
const getDaysElapsed = (plant) => {
  const start = new Date(plant.data_inicio)
  const now = new Date()
  return Math.floor((now - start) / (1000 * 60 * 60 * 24)) + (plant.ajuste_dias || 0)
}

// Progresso em percentagem
const getProgress = (plant) => {
  return Math.min(100, Math.round((getDaysElapsed(plant) / plant.ciclo_total) * 100))
}

// Emoji do estágio
const getStageEmoji = (plant) => {
  const progress = getProgress(plant)
  if (progress < 25) return '🌱'
  if (progress < 50) return '🌿'
  if (progress < 75) return '🪴'
  return '🌸'
}

// Navegação entre andares
const navigateToFloor = (floor) => {
  router.push(`/floor/${floor}`)
}

// Selecionar planta
const selectPlant = (plant) => {
  store.selectPlant(plant)
}

// Remover planta
const removePlant = async (plant) => {
  if (confirm(`Tens a certeza que queres remover ${plant.nome}?`)) {
    await store.removePlant(plant.id)
  }
}

// Calcular rega
const calculateWatering = async () => {
  isCalculating.value = true
  try {
    const result = await store.calculateWatering(currentFloor.value)
    wateringResult.value = result
  } catch (error) {
    store.showToast('Erro ao calcular rega', 'error')
  } finally {
    isCalculating.value = false
  }
}

// Carregar dados ao mudar de andar
watch(currentFloor, () => {
  store.fetchSensorData()
}, { immediate: true })
</script>

<style scoped>
.floor-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

/* Navegação */
.nav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  padding: 8px 16px;
  background: rgba(74,85,104,0.2);
  border-radius: 8px;
  transition: all 0.2s;
}

.back-button:hover {
  background: rgba(74,85,104,0.4);
  color: #fff;
}

.floor-nav {
  display: flex;
  gap: 8px;
}

.nav-btn {
  padding: 8px 16px;
  background: rgba(74,85,104,0.2);
  border: 1px solid transparent;
  border-radius: 8px;
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: rgba(74,85,104,0.4);
}

.nav-btn--active {
  background: rgba(34,139,34,0.3);
  border-color: rgba(34,139,34,0.5);
  color: #32CD32;
}

/* Header */
.floor-header {
  margin-bottom: 32px;
}

.floor-title {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 20px;
}

/* Painel de Sensores */
.sensor-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 20px;
  background: rgba(26,47,35,0.6);
  border: 1px solid rgba(34,139,34,0.2);
  border-radius: 16px;
  align-items: center;
}

.sensor-panel-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,0.6);
  padding: 8px 12px;
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
}

.sensor-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(0,0,0,0.2);
  border-radius: 12px;
  min-width: 160px;
}

.sensor-icon {
  font-size: 24px;
}

.sensor-data {
  display: flex;
  flex-direction: column;
}

.sensor-label {
  font-size: 11px;
  color: rgba(255,255,255,0.5);
  text-transform: uppercase;
}

.sensor-value {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.sensor-bar {
  width: 60px;
  height: 6px;
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
  overflow: hidden;
}

.sensor-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.humidity-bar {
  background: linear-gradient(90deg, #3B82F6, #06B6D4);
}

.water-calc-btn {
  margin-left: auto;
  padding: 12px 24px;
  background: linear-gradient(135deg, #3B82F6, #06B6D4);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.water-calc-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59,130,246,0.4);
}

.water-calc-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Resultado de Rega */
.watering-result {
  margin-bottom: 24px;
  padding: 20px;
  background: rgba(59,130,246,0.1);
  border: 1px solid rgba(59,130,246,0.3);
  border-radius: 16px;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.result-header h3 {
  color: #fff;
  font-size: 18px;
}

.result-icon {
  font-size: 24px;
}

.result-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rec-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
}

.rec-name {
  color: #fff;
  font-weight: 600;
  min-width: 120px;
}

.rec-amount {
  color: #3B82F6;
  font-weight: 700;
  font-size: 18px;
}

.rec-status {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
}

.rec-status.needs_water {
  background: rgba(239,68,68,0.2);
  color: #FCA5A5;
}

.rec-status.ok {
  background: rgba(34,197,94,0.2);
  color: #86EFAC;
}

.close-result {
  margin-top: 12px;
  padding: 8px 16px;
  background: rgba(255,255,255,0.1);
  border: none;
  border-radius: 8px;
  color: rgba(255,255,255,0.7);
  cursor: pointer;
}

/* Tabuleiro */
.tray-wrapper {
  margin-bottom: 40px;
}

/* Estatísticas */
.floor-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 40px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: rgba(26,47,35,0.6);
  border: 1px solid rgba(34,139,34,0.2);
  border-radius: 12px;
}

.stat-card--alert {
  border-color: rgba(239,68,68,0.4);
  background: rgba(239,68,68,0.1);
}

.stat-number {
  font-size: 32px;
  font-weight: 700;
  color: #32CD32;
}

.stat-card--alert .stat-number {
  color: #FCA5A5;
}

.stat-label {
  font-size: 12px;
  color: rgba(255,255,255,0.6);
  margin-top: 4px;
}

/* Lista de Plantas */
.plants-list {
  padding: 24px;
  background: rgba(26,47,35,0.4);
  border-radius: 16px;
}

.list-title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 20px;
}

.empty-message {
  text-align: center;
  color: rgba(255,255,255,0.5);
  padding: 40px;
}

.plants-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.plant-card {
  padding: 16px;
  background: rgba(0,0,0,0.2);
  border: 1px solid rgba(34,139,34,0.2);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.plant-card:hover {
  border-color: rgba(34,139,34,0.5);
  transform: translateY(-2px);
}

.plant-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.plant-emoji {
  font-size: 24px;
}

.plant-name {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.plant-card-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.plant-detail {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.detail-label {
  color: rgba(255,255,255,0.5);
}

.detail-value {
  color: #fff;
  font-weight: 500;
}

.plant-progress {
  height: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #228B22, #32CD32);
  border-radius: 2px;
}

.remove-btn {
  width: 100%;
  padding: 8px;
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.3);
  border-radius: 8px;
  color: #FCA5A5;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.remove-btn:hover {
  background: rgba(239,68,68,0.2);
}

/* Responsividade */
@media (max-width: 768px) {
  .floor-view {
    padding: 12px;
  }
  
  .floor-title {
    font-size: 1.25rem;
  }
  
  .floor-stats {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .sensor-panel {
    flex-direction: column;
    padding: 12px;
    gap: 12px;
  }
  
  .water-calc-btn {
    margin-left: 0;
    width: 100%;
  }
  
  .nav-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .floor-nav {
    justify-content: center;
  }
  
  .nav-btn {
    flex: 1;
    padding: 8px 12px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .tray-wrapper {
    overflow-x: auto;
    padding-bottom: 8px;
  }
  
  .sensor-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .sensor-bar {
    width: 100%;
  }
  
  .stat-card {
    padding: 12px;
  }
  
  .stat-number {
    font-size: 1.5rem;
  }
  
  .back-button {
    padding: 8px 12px;
    font-size: 14px;
  }
}
</style>
