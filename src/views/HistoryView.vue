<template>
  <div class="history-view">
    <!-- Header de Navegação -->
    <div class="nav-header">
      <router-link to="/" class="back-button">
        <span>←</span>
        <span>Voltar</span>
      </router-link>
      <h1 class="page-title">📊 Histórico & Tendências</h1>
    </div>

    <!-- Seletor de Intervalo -->
    <div class="range-selector">
      <button
        v-for="option in rangeOptions"
        :key="option.value"
        @click="selectedRange = option.value"
        :class="['range-btn', { 'range-btn--active': selectedRange === option.value }]"
      >
        {{ option.label }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">A carregar dados do histórico...</p>
    </div>

    <!-- Erro -->
    <div v-else-if="error" class="error-message">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
      <button @click="fetchHistory" class="retry-btn">Tentar novamente</button>
    </div>

    <!-- Sem Dados -->
    <div v-else-if="!historyData || historyData.length === 0" class="no-data">
      <span class="no-data-icon">📭</span>
      <p>Ainda não há dados de histórico.</p>
      <p class="no-data-hint">Os dados serão recolhidos automaticamente a cada 15 minutos.</p>
    </div>

    <!-- Conteúdo Principal -->
    <div v-else class="history-content">
      <!-- Estatísticas Resumidas -->
      <div class="stats-section">
        <h2 class="section-title">📈 Estatísticas do Período</h2>
        <div class="stats-grid">
          <!-- Temperatura -->
          <div class="stat-card temp-card">
            <div class="stat-header">
              <span class="stat-icon">🌡️</span>
              <h3>Temperatura</h3>
            </div>
            <div class="stat-values">
              <div class="stat-item">
                <span class="stat-label">Mín</span>
                <span class="stat-value min">{{ stats.temperatura.min }}°C</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Média</span>
                <span class="stat-value avg">{{ stats.temperatura.avg }}°C</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Máx</span>
                <span class="stat-value max">{{ stats.temperatura.max }}°C</span>
              </div>
            </div>
          </div>

          <!-- Humidade -->
          <div class="stat-card hum-card">
            <div class="stat-header">
              <span class="stat-icon">💧</span>
              <h3>Humidade</h3>
            </div>
            <div class="stat-values">
              <div class="stat-item">
                <span class="stat-label">Mín</span>
                <span class="stat-value min">{{ stats.humidade.min }}%</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Média</span>
                <span class="stat-value avg">{{ stats.humidade.avg }}%</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Máx</span>
                <span class="stat-value max">{{ stats.humidade.max }}%</span>
              </div>
            </div>
          </div>

          <!-- VPD (se disponível) -->
          <div v-if="stats.vpd" class="stat-card vpd-card">
            <div class="stat-header">
              <span class="stat-icon">🌫️</span>
              <h3>VPD</h3>
            </div>
            <div class="stat-values">
              <div class="stat-item">
                <span class="stat-label">Mín</span>
                <span class="stat-value min">{{ stats.vpd.min }} kPa</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Média</span>
                <span class="stat-value avg">{{ stats.vpd.avg }} kPa</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Máx</span>
                <span class="stat-value max">{{ stats.vpd.max }} kPa</span>
              </div>
            </div>
            <p class="vpd-hint">Ideal para plantas: 0.8-1.2 kPa</p>
          </div>
        </div>
      </div>

      <!-- Gráficos -->
      <div class="charts-section">
        <!-- Gráfico de Temperatura -->
        <div class="chart-container">
          <h3 class="chart-title">🌡️ Temperatura ao Longo do Tempo</h3>
          <div class="chart-wrapper">
            <Line :data="temperatureChartData" :options="temperatureChartOptions" />
          </div>
        </div>

        <!-- Gráfico de Humidade -->
        <div class="chart-container">
          <h3 class="chart-title">💧 Humidade ao Longo do Tempo</h3>
          <div class="chart-wrapper">
            <Line :data="humidityChartData" :options="humidityChartOptions" />
          </div>
        </div>

        <!-- Gráfico de VPD (se disponível) -->
        <div v-if="hasVPDData" class="chart-container">
          <h3 class="chart-title">🌫️ VPD (Vapor Pressure Deficit)</h3>
          <div class="chart-wrapper">
            <Line :data="vpdChartData" :options="vpdChartOptions" />
          </div>
        </div>
      </div>

      <!-- Info do Dataset -->
      <div class="data-info">
        <span>📊 {{ dataCount }} registos no período selecionado</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import axios from 'axios'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line } from 'vue-chartjs'

// Registar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

// Estado
const selectedRange = ref('24h')
const isLoading = ref(false)
const error = ref(null)
const historyData = ref([])
const stats = ref({
  temperatura: { min: 0, max: 0, avg: 0 },
  humidade: { min: 0, max: 0, avg: 0 },
  vpd: null
})

// Opções de intervalo
const rangeOptions = [
  { value: '24h', label: 'Últimas 24h' },
  { value: '7d', label: '7 Dias' },
  { value: '30d', label: '30 Dias' }
]

// Data count
const dataCount = computed(() => historyData.value.length)

// Verificar se tem dados VPD
const hasVPDData = computed(() => {
  return historyData.value.some(d => d.vpd !== null)
})

// Formatar labels do eixo X baseado no range
const formatLabel = (timestamp) => {
  const date = new Date(timestamp)
  if (selectedRange.value === '24h') {
    return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  } else {
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })
  }
}

// Dados do gráfico de temperatura
const temperatureChartData = computed(() => ({
  labels: historyData.value.map(d => formatLabel(d.timestamp)),
  datasets: [{
    label: 'Temperatura (°C)',
    data: historyData.value.map(d => d.temperatura_c),
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    fill: true,
    tension: 0.3,
    pointRadius: selectedRange.value === '24h' ? 3 : 1,
    pointHoverRadius: 6
  }]
}))

// Opções do gráfico de temperatura
const temperatureChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#fff',
      bodyColor: '#fff',
      padding: 12,
      displayColors: false,
      callbacks: {
        title: (items) => {
          const idx = items[0].dataIndex
          const d = historyData.value[idx]
          return new Date(d.timestamp).toLocaleString('pt-PT')
        },
        label: (item) => `Temperatura: ${item.raw}°C`
      }
    }
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(255, 255, 255, 0.1)'
      },
      ticks: {
        color: '#a5d6a7',
        maxTicksLimit: selectedRange.value === '24h' ? 12 : 10
      }
    },
    y: {
      grid: {
        color: 'rgba(255, 255, 255, 0.1)'
      },
      ticks: {
        color: '#a5d6a7',
        callback: (value) => `${value}°C`
      }
    }
  }
}))

// Dados do gráfico de humidade
const humidityChartData = computed(() => ({
  labels: historyData.value.map(d => formatLabel(d.timestamp)),
  datasets: [{
    label: 'Humidade (%)',
    data: historyData.value.map(d => d.humidade_perc),
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    fill: true,
    tension: 0.3,
    pointRadius: selectedRange.value === '24h' ? 3 : 1,
    pointHoverRadius: 6
  }]
}))

// Opções do gráfico de humidade
const humidityChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#fff',
      bodyColor: '#fff',
      padding: 12,
      displayColors: false,
      callbacks: {
        title: (items) => {
          const idx = items[0].dataIndex
          const d = historyData.value[idx]
          return new Date(d.timestamp).toLocaleString('pt-PT')
        },
        label: (item) => `Humidade: ${item.raw}%`
      }
    }
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(255, 255, 255, 0.1)'
      },
      ticks: {
        color: '#a5d6a7',
        maxTicksLimit: selectedRange.value === '24h' ? 12 : 10
      }
    },
    y: {
      grid: {
        color: 'rgba(255, 255, 255, 0.1)'
      },
      ticks: {
        color: '#a5d6a7',
        callback: (value) => `${value}%`
      },
      min: 0,
      max: 100
    }
  }
}))

// Dados do gráfico de VPD
const vpdChartData = computed(() => ({
  labels: historyData.value.map(d => formatLabel(d.timestamp)),
  datasets: [{
    label: 'VPD (kPa)',
    data: historyData.value.map(d => d.vpd),
    borderColor: '#8b5cf6',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    fill: true,
    tension: 0.3,
    pointRadius: selectedRange.value === '24h' ? 3 : 1,
    pointHoverRadius: 6
  }]
}))

// Opções do gráfico de VPD
const vpdChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#fff',
      bodyColor: '#fff',
      padding: 12,
      displayColors: false,
      callbacks: {
        title: (items) => {
          const idx = items[0].dataIndex
          const d = historyData.value[idx]
          return new Date(d.timestamp).toLocaleString('pt-PT')
        },
        label: (item) => `VPD: ${item.raw} kPa`
      }
    },
    annotation: {
      annotations: {
        idealZone: {
          type: 'box',
          yMin: 0.8,
          yMax: 1.2,
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          borderColor: 'rgba(76, 175, 80, 0.3)'
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(255, 255, 255, 0.1)'
      },
      ticks: {
        color: '#a5d6a7',
        maxTicksLimit: selectedRange.value === '24h' ? 12 : 10
      }
    },
    y: {
      grid: {
        color: 'rgba(255, 255, 255, 0.1)'
      },
      ticks: {
        color: '#a5d6a7',
        callback: (value) => `${value} kPa`
      },
      min: 0
    }
  }
}))

// Buscar dados do histórico
const fetchHistory = async () => {
  isLoading.value = true
  error.value = null

  try {
    const response = await axios.get(`/.netlify/functions/get-history?range=${selectedRange.value}`)
    historyData.value = response.data.data || []
    stats.value = response.data.stats || {
      temperatura: { min: 0, max: 0, avg: 0 },
      humidade: { min: 0, max: 0, avg: 0 },
      vpd: null
    }
  } catch (err) {
    console.error('Erro ao carregar histórico:', err)
    error.value = 'Não foi possível carregar o histórico. Verifique a conexão.'
  } finally {
    isLoading.value = false
  }
}

// Watch para mudanças no range
watch(selectedRange, () => {
  fetchHistory()
})

// Carregar dados ao montar
onMounted(() => {
  fetchHistory()
})
</script>

<style scoped>
.history-view {
  min-height: 100vh;
  padding: 1rem;
  padding-bottom: 2rem;
}

/* Navegação */
.nav-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #81c784;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.2s;
}

.back-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateX(-2px);
}

.page-title {
  font-size: 1.5rem;
  color: #fff;
  margin: 0;
}

/* Seletor de Range */
.range-selector {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.range-btn {
  padding: 0.6rem 1.2rem;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid transparent;
  border-radius: 10px;
  color: #a5d6a7;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.range-btn:hover {
  background: rgba(129, 199, 132, 0.1);
  border-color: rgba(129, 199, 132, 0.3);
}

.range-btn--active {
  background: rgba(129, 199, 132, 0.2);
  border-color: #81c784;
  color: #fff;
}

/* Loading */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(129, 199, 132, 0.2);
  border-top-color: #81c784;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  color: #a5d6a7;
  margin-top: 1rem;
}

/* Erro */
.error-message {
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  color: #ef9a9a;
}

.error-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.5rem;
}

.retry-btn {
  margin-top: 1rem;
  padding: 0.5rem 1.5rem;
  background: #f44336;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
}

.retry-btn:hover {
  background: #d32f2f;
}

/* Sem Dados */
.no-data {
  text-align: center;
  padding: 3rem;
  color: #a5d6a7;
}

.no-data-icon {
  font-size: 4rem;
  display: block;
  margin-bottom: 1rem;
}

.no-data-hint {
  font-size: 0.9rem;
  color: rgba(165, 214, 167, 0.7);
  margin-top: 0.5rem;
}

/* Conteúdo Principal */
.history-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Secção de Estatísticas */
.stats-section {
  background: linear-gradient(145deg, #1e3a2d, #162a21);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(129, 199, 132, 0.15);
}

.section-title {
  color: #81c784;
  font-size: 1.1rem;
  margin: 0 0 1rem 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.stat-header h3 {
  color: #fff;
  margin: 0;
  font-size: 0.95rem;
}

.stat-icon {
  font-size: 1.2rem;
}

.stat-values {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.stat-label {
  color: #a5d6a7;
  font-size: 0.75rem;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-weight: 700;
  font-size: 1rem;
}

.stat-value.min { color: #60a5fa; }
.stat-value.avg { color: #fff; }
.stat-value.max { color: #f87171; }

.temp-card .stat-value.min { color: #60a5fa; }
.temp-card .stat-value.max { color: #ef4444; }

.hum-card .stat-value.min { color: #fbbf24; }
.hum-card .stat-value.max { color: #3b82f6; }

.vpd-card .stat-value.min { color: #60a5fa; }
.vpd-card .stat-value.max { color: #8b5cf6; }

.vpd-hint {
  color: rgba(165, 214, 167, 0.7);
  font-size: 0.75rem;
  text-align: center;
  margin: 0.75rem 0 0 0;
}

/* Secção de Gráficos */
.charts-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.chart-container {
  background: linear-gradient(145deg, #1e3a2d, #162a21);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(129, 199, 132, 0.15);
}

.chart-title {
  color: #81c784;
  font-size: 1rem;
  margin: 0 0 1rem 0;
}

.chart-wrapper {
  height: 250px;
  position: relative;
}

/* Info do Dataset */
.data-info {
  text-align: center;
  color: rgba(165, 214, 167, 0.7);
  font-size: 0.85rem;
  padding: 0.5rem;
}

/* Responsivo */
@media (max-width: 600px) {
  .history-view {
    padding: 0.75rem;
  }

  .page-title {
    font-size: 1.2rem;
  }

  .range-selector {
    justify-content: center;
  }

  .range-btn {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .chart-wrapper {
    height: 200px;
  }
}
</style>
