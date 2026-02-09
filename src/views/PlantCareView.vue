<template>
  <div class="plant-care-view">
    <!-- Header de Navegação -->
    <div class="nav-header">
      <router-link to="/" class="back-button">
        <span>←</span>
        <span>Voltar</span>
      </router-link>
      <h1 class="page-title">🌿 Guia de Cuidados</h1>
    </div>

    <!-- Seletor de Plantas -->
    <div class="plant-selector">
      <h2 class="selector-title">Selecionar Planta</h2>
      <div class="plants-grid" v-if="availablePlants.length > 0">
        <button
          v-for="plant in availablePlants"
          :key="plant.id"
          @click="selectPlant(plant)"
          :class="['plant-option', { 'plant-option--selected': selectedPlant?.id === plant.id }]"
        >
          <span class="plant-emoji">🌱</span>
          <span class="plant-name">{{ plant.nome }}</span>
          <span class="plant-floor">{{ plant.andar }}º Andar</span>
        </button>
      </div>
      <div v-else class="no-plants">
        <span class="no-plants-icon">🌾</span>
        <p>Nenhuma planta cadastrada na estufa.</p>
        <router-link to="/" class="add-plants-link">Adicionar plantas</router-link>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">A carregar informações da planta...</p>
    </div>

    <!-- Conteúdo de Cuidados -->
    <div v-else-if="plantCareInfo && selectedPlant" class="care-content">
      <!-- Cabeçalho da Planta -->
      <div class="plant-header">
        <div class="plant-main-info">
          <h2 class="plant-title">{{ selectedPlant.nome }}</h2>
          <p class="plant-scientific" v-if="plantCareInfo.nome_cientifico">
            <em>{{ plantCareInfo.nome_cientifico }}</em>
          </p>
          <div class="plant-meta">
            <span v-if="plantCareInfo.familia" class="meta-item">
              <span class="meta-icon">🏷️</span> {{ plantCareInfo.familia }}
            </span>
            <span v-if="plantCareInfo.origem" class="meta-item">
              <span class="meta-icon">🌍</span> {{ plantCareInfo.origem }}
            </span>
          </div>
        </div>
        <div class="source-badge" :class="plantCareInfo.source">
          {{ plantCareInfo.source === 'ai' ? '🤖 Groq AI' : '📋 Dados Base' }}
        </div>
      </div>

      <!-- Descrição -->
      <div class="info-section description-section">
        <h3 class="section-title">📖 Sobre a Planta</h3>
        <p class="description-text">{{ plantCareInfo.descricao }}</p>
      </div>

      <!-- Benefícios -->
      <div class="info-section benefits-section" v-if="plantCareInfo.beneficios?.length">
        <h3 class="section-title">✨ Benefícios</h3>
        <ul class="benefits-list">
          <li v-for="(benefit, idx) in plantCareInfo.beneficios" :key="idx" class="benefit-item">
            <span class="benefit-icon">✓</span>
            {{ benefit }}
          </li>
        </ul>
      </div>

      <!-- Cuidados Essenciais -->
      <div class="info-section care-section">
        <h3 class="section-title">🛠️ Cuidados Essenciais</h3>
        
        <div class="care-grid">
          <!-- Rega -->
          <div class="care-card" v-if="plantCareInfo.cuidados?.rega">
            <div class="care-card-header">
              <span class="care-icon">💧</span>
              <h4>Rega</h4>
            </div>
            <div class="care-card-body">
              <div class="care-detail">
                <strong>Frequência:</strong> {{ plantCareInfo.cuidados.rega.frequencia }}
              </div>
              <div class="care-detail">
                <strong>Quantidade:</strong> {{ plantCareInfo.cuidados.rega.quantidade }}
              </div>
              <p class="care-tip">{{ plantCareInfo.cuidados.rega.dicas }}</p>
            </div>
          </div>

          <!-- Luz -->
          <div class="care-card" v-if="plantCareInfo.cuidados?.luz">
            <div class="care-card-header">
              <span class="care-icon">☀️</span>
              <h4>Luz</h4>
            </div>
            <div class="care-card-body">
              <div class="care-detail">
                <strong>Tipo:</strong> {{ plantCareInfo.cuidados.luz.tipo }}
              </div>
              <div class="care-detail">
                <strong>Horas:</strong> {{ plantCareInfo.cuidados.luz.horas }}
              </div>
              <p class="care-tip">{{ plantCareInfo.cuidados.luz.dicas }}</p>
            </div>
          </div>

          <!-- Solo -->
          <div class="care-card" v-if="plantCareInfo.cuidados?.solo">
            <div class="care-card-header">
              <span class="care-icon">🪴</span>
              <h4>Solo</h4>
            </div>
            <div class="care-card-body">
              <div class="care-detail">
                <strong>Tipo:</strong> {{ plantCareInfo.cuidados.solo.tipo }}
              </div>
              <div class="care-detail">
                <strong>pH:</strong> {{ plantCareInfo.cuidados.solo.ph }}
              </div>
              <p class="care-tip">{{ plantCareInfo.cuidados.solo.drenagem }}</p>
            </div>
          </div>

          <!-- Temperatura -->
          <div class="care-card" v-if="plantCareInfo.cuidados?.temperatura">
            <div class="care-card-header">
              <span class="care-icon">🌡️</span>
              <h4>Temperatura</h4>
            </div>
            <div class="care-card-body">
              <div class="care-detail">
                <strong>Ideal:</strong> {{ plantCareInfo.cuidados.temperatura.ideal }}
              </div>
              <div class="care-detail">
                <strong>Mín/Máx:</strong> {{ plantCareInfo.cuidados.temperatura.minima }} - {{ plantCareInfo.cuidados.temperatura.maxima }}
              </div>
            </div>
          </div>

          <!-- Humidade -->
          <div class="care-card" v-if="plantCareInfo.cuidados?.humidade">
            <div class="care-card-header">
              <span class="care-icon">💨</span>
              <h4>Humidade do Ar</h4>
            </div>
            <div class="care-card-body">
              <div class="care-detail">
                <strong>Ideal:</strong> {{ plantCareInfo.cuidados.humidade.ideal }}
              </div>
              <p class="care-tip">{{ plantCareInfo.cuidados.humidade.dicas }}</p>
            </div>
          </div>

          <!-- Fertilização -->
          <div class="care-card" v-if="plantCareInfo.cuidados?.fertilizacao">
            <div class="care-card-header">
              <span class="care-icon">🧪</span>
              <h4>Fertilização</h4>
            </div>
            <div class="care-card-body">
              <div class="care-detail">
                <strong>Frequência:</strong> {{ plantCareInfo.cuidados.fertilizacao.frequencia }}
              </div>
              <div class="care-detail">
                <strong>Tipo:</strong> {{ plantCareInfo.cuidados.fertilizacao.tipo }}
              </div>
              <p class="care-tip">Melhor época: {{ plantCareInfo.cuidados.fertilizacao.epoca }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Pragas e Doenças -->
      <div class="info-section pests-section" v-if="plantCareInfo.pragas_doencas?.length">
        <h3 class="section-title">🐛 Pragas e Doenças Comuns</h3>
        <div class="pests-grid">
          <div 
            v-for="(pest, idx) in plantCareInfo.pragas_doencas" 
            :key="idx" 
            class="pest-card"
          >
            <h4 class="pest-name">⚠️ {{ pest.nome }}</h4>
            <p class="pest-prevention"><strong>Prevenção:</strong> {{ pest.prevencao }}</p>
          </div>
        </div>
      </div>

      <!-- Colheita -->
      <div class="info-section harvest-section" v-if="plantCareInfo.colheita">
        <h3 class="section-title">🧺 Colheita</h3>
        <div class="harvest-info">
          <div class="harvest-item">
            <span class="harvest-icon">⏱️</span>
            <div>
              <strong>Tempo até colheita:</strong>
              <p>{{ plantCareInfo.colheita.tempo }}</p>
            </div>
          </div>
          <div class="harvest-item">
            <span class="harvest-icon">👀</span>
            <div>
              <strong>Sinais de maturidade:</strong>
              <p>{{ plantCareInfo.colheita.sinais }}</p>
            </div>
          </div>
          <div class="harvest-item">
            <span class="harvest-icon">✂️</span>
            <div>
              <strong>Como colher:</strong>
              <p>{{ plantCareInfo.colheita.metodo }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Dicas Extras -->
      <div class="info-section tips-section" v-if="plantCareInfo.dicas_extras?.length">
        <h3 class="section-title">💡 Dicas Extras</h3>
        <ul class="tips-list">
          <li v-for="(tip, idx) in plantCareInfo.dicas_extras" :key="idx" class="tip-item">
            <span class="tip-icon">💡</span>
            {{ tip }}
          </li>
        </ul>
      </div>

      <!-- Curiosidades -->
      <div class="info-section curiosity-section" v-if="plantCareInfo.curiosidades?.length">
        <h3 class="section-title">🔍 Curiosidades</h3>
        <ul class="curiosity-list">
          <li v-for="(curiosity, idx) in plantCareInfo.curiosidades" :key="idx" class="curiosity-item">
            <span class="curiosity-icon">🌟</span>
            {{ curiosity }}
          </li>
        </ul>
      </div>
    </div>

    <!-- Estado Inicial -->
    <div v-else-if="!selectedPlant" class="empty-state">
      <div class="empty-icon">🌱</div>
      <p>Selecione uma planta acima para ver informações detalhadas sobre como cuidar dela.</p>
    </div>

    <!-- Erro -->
    <div v-if="error" class="error-message">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
      <button @click="retryFetch" class="retry-btn">Tentar novamente</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useGreenhouseStore } from '@/stores/greenhouse'
import axios from 'axios'

const greenhouseStore = useGreenhouseStore()

const selectedPlant = ref(null)
const plantCareInfo = ref(null)
const isLoading = ref(false)
const error = ref(null)

// Plantas disponíveis na estufa
const availablePlants = computed(() => greenhouseStore.plants)

// Carregar plantas ao montar
onMounted(async () => {
  await greenhouseStore.fetchPlants()
})

// Selecionar planta e carregar informações
const selectPlant = async (plant) => {
  selectedPlant.value = plant
  plantCareInfo.value = null
  error.value = null
  isLoading.value = true

  try {
    const response = await axios.post('/.netlify/functions/plant-care-info', {
      name: plant.nome
    })
    plantCareInfo.value = response.data
  } catch (err) {
    console.error('Erro ao carregar informações:', err)
    error.value = 'Não foi possível carregar as informações da planta. Verifique sua conexão.'
  } finally {
    isLoading.value = false
  }
}

// Tentar novamente após erro
const retryFetch = () => {
  if (selectedPlant.value) {
    selectPlant(selectedPlant.value)
  }
}
</script>

<style scoped>
.plant-care-view {
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

/* Seletor de Plantas */
.plant-selector {
  background: linear-gradient(145deg, #1e3a2d, #162a21);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(129, 199, 132, 0.2);
}

.selector-title {
  color: #81c784;
  font-size: 1.1rem;
  margin: 0 0 1rem 0;
}

.plants-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.plant-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 100px;
}

.plant-option:hover {
  background: rgba(129, 199, 132, 0.1);
  border-color: rgba(129, 199, 132, 0.3);
}

.plant-option--selected {
  background: rgba(129, 199, 132, 0.2);
  border-color: #81c784;
}

.plant-emoji {
  font-size: 1.5rem;
}

.plant-name {
  color: #fff;
  font-weight: 600;
  font-size: 0.9rem;
}

.plant-floor {
  color: #a5d6a7;
  font-size: 0.75rem;
}

.no-plants {
  text-align: center;
  padding: 2rem;
  color: #a5d6a7;
}

.no-plants-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
}

.add-plants-link {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: #4caf50;
  color: #fff;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
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

/* Conteúdo Principal */
.care-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Cabeçalho da Planta */
.plant-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
  background: linear-gradient(145deg, #2d5a43, #1e3a2d);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(129, 199, 132, 0.3);
}

.plant-title {
  color: #fff;
  font-size: 1.8rem;
  margin: 0;
}

.plant-scientific {
  color: #a5d6a7;
  font-size: 1rem;
  margin: 0.25rem 0 0 0;
}

.plant-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 0.75rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: #c8e6c9;
  font-size: 0.9rem;
}

.source-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

.source-badge.ai {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
}

.source-badge.default {
  background: rgba(255, 255, 255, 0.1);
  color: #a5d6a7;
}

/* Secções de Informação */
.info-section {
  background: linear-gradient(145deg, #1e3a2d, #162a21);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(129, 199, 132, 0.15);
}

.section-title {
  color: #81c784;
  font-size: 1.2rem;
  margin: 0 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(129, 199, 132, 0.2);
}

.description-text {
  color: #e8f5e9;
  line-height: 1.6;
  margin: 0;
}

/* Benefícios */
.benefits-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(76, 175, 80, 0.15);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  color: #a5d6a7;
}

.benefit-icon {
  color: #4caf50;
  font-weight: bold;
}

/* Grid de Cuidados */
.care-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.care-card {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(129, 199, 132, 0.1);
}

.care-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(129, 199, 132, 0.1);
}

.care-card-header h4 {
  color: #81c784;
  margin: 0;
  font-size: 1rem;
}

.care-icon {
  font-size: 1.25rem;
}

.care-card-body {
  padding: 1rem;
}

.care-detail {
  color: #e8f5e9;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.care-detail strong {
  color: #a5d6a7;
}

.care-tip {
  color: #81c784;
  font-size: 0.85rem;
  font-style: italic;
  margin: 0.5rem 0 0 0;
  padding-top: 0.5rem;
  border-top: 1px dashed rgba(129, 199, 132, 0.2);
}

/* Pragas */
.pests-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.pest-card {
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid rgba(255, 152, 0, 0.2);
  border-radius: 12px;
  padding: 1rem;
}

.pest-name {
  color: #ffb74d;
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
}

.pest-prevention {
  color: #e8f5e9;
  margin: 0;
  font-size: 0.9rem;
}

.pest-prevention strong {
  color: #a5d6a7;
}

/* Colheita */
.harvest-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.harvest-item {
  display: flex;
  gap: 1rem;
  background: rgba(76, 175, 80, 0.1);
  padding: 1rem;
  border-radius: 12px;
}

.harvest-icon {
  font-size: 1.5rem;
}

.harvest-item strong {
  color: #81c784;
  display: block;
  margin-bottom: 0.25rem;
}

.harvest-item p {
  color: #e8f5e9;
  margin: 0;
  font-size: 0.9rem;
}

/* Dicas e Curiosidades */
.tips-list,
.curiosity-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.tip-item,
.curiosity-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  color: #e8f5e9;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 8px;
}

.tip-icon,
.curiosity-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

/* Estado Vazio */
.empty-state {
  text-align: center;
  padding: 3rem;
  color: #a5d6a7;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
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

/* Responsivo */
@media (max-width: 600px) {
  .plant-care-view {
    padding: 0.75rem;
  }
  
  .page-title {
    font-size: 1.2rem;
  }
  
  .plant-header {
    padding: 1rem;
  }
  
  .plant-title {
    font-size: 1.4rem;
  }
  
  .care-grid {
    grid-template-columns: 1fr;
  }
  
  .harvest-info {
    grid-template-columns: 1fr;
  }
}
</style>
