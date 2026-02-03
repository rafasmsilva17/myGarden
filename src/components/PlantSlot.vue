<template>
  <!-- Slot individual de planta - Sistema de Camadas 3D -->
  <div 
    class="plant-slot-wrapper"
    :class="{ 
      'slot-empty': !plant,
      'slot-occupied': plant,
    }"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @click="handleClick"
  >
    <!-- Container 3D do Slot -->
    <div class="plant-slot-3d" :class="{ 'slot-hover': isHovered }">
      
      <!-- CAMADA 0: Buraco/Depressão na terra -->
      <div class="soil-hole">
        <div class="hole-shadow"></div>
      </div>
      
      <!-- CAMADA 1: Textura de Terra (fundo fixo com profundidade) -->
      <div class="soil-layer">
        <!-- Base de terra -->
        <div class="soil-base"></div>
        <!-- Textura granulada -->
        <div class="soil-texture"></div>
        <!-- Sombras de profundidade -->
        <div class="soil-depth-shadow"></div>
        <!-- Borda da terra (elevação) -->
        <div class="soil-rim"></div>
        <!-- Partículas de terra para realismo -->
        <div class="soil-particles">
          <span v-for="n in 12" :key="n" class="particle" :style="getParticleStyle(n)"></span>
        </div>
        <!-- Pequenas pedras -->
        <div class="soil-pebbles">
          <span v-for="n in 5" :key="'peb'+n" class="pebble" :style="getPebbleStyle(n)"></span>
        </div>
      </div>

      <!-- CAMADA 2: Sprite da Planta (overlay transparente com sombra 3D) -->
      <div v-if="plant" class="plant-layer animate-sprout">
        <!-- Sombra da planta no solo (elipse realista) -->
        <div class="plant-shadow-ground" :style="shadowStyle"></div>
        
        <!-- Container da planta com perspectiva -->
        <div class="plant-sprite-container" :class="{ 'animate-sway': growthStage >= 2 }">
          <!-- Sprite da planta -->
          <img 
            :src="currentSprite"
            :alt="plant.nome"
            class="plant-sprite"
          />
          <!-- Brilho/destaque na planta -->
          <div class="plant-highlight"></div>
        </div>
      </div>

      <!-- CAMADA 3: UI de Interação -->
      <div class="interaction-layer">
        <!-- Slot vazio - botão adicionar -->
        <button 
          v-if="!plant"
          class="add-button"
          @click.stop="openAddModal"
        >
          <div class="add-button-bg"></div>
          <span class="add-icon">+</span>
          <span class="add-text">Plantar</span>
        </button>

        <!-- Slot ocupado - info hover -->
        <div v-else class="plant-info" :class="{ 'plant-info--visible': isHovered }">
          <div class="info-card">
            <div class="info-card-glow"></div>
            <h4 class="info-name">{{ plant.nome }}</h4>
            <div class="info-stats">
              <div class="stat">
                <span class="stat-icon">📅</span>
                <span class="stat-value">Dia {{ daysElapsed }}/{{ plant.ciclo_total }}</span>
              </div>
              <div class="stat">
                <span class="stat-icon">🌱</span>
                <span class="stat-value">Estágio {{ growthStage }}/4</span>
              </div>
              <div class="stat">
                <span class="stat-icon">💧</span>
                <span class="stat-value">{{ plant.targets_humidade }}%</span>
              </div>
            </div>
            <!-- Barra de progresso 3D -->
            <div class="progress-bar-3d">
              <div class="progress-track"></div>
              <div 
                class="progress-fill"
                :style="{ width: `${progressPercent}%` }"
              >
                <div class="progress-shine"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Indicador de estágio (canto) - 3D -->
      <div v-if="plant" class="stage-badge" :class="`stage-${growthStage}`">
        <span class="badge-emoji">{{ stageEmoji }}</span>
        <div class="badge-glow"></div>
      </div>
      
      <!-- Efeito de brilho no hover -->
      <div class="slot-glow" :class="{ 'glow-active': isHovered && plant }"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useGreenhouseStore } from '@/stores/greenhouse'

const props = defineProps({
  plant: {
    type: Object,
    default: null
  },
  slotIndex: {
    type: Number,
    required: true
  },
  floorNumber: {
    type: Number,
    required: true
  }
})

const store = useGreenhouseStore()
const isHovered = ref(false)

// Calcula dias passados desde o início
const daysElapsed = computed(() => {
  if (!props.plant) return 0
  const start = new Date(props.plant.data_inicio)
  const now = new Date()
  const diffTime = Math.abs(now - start)
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays + (props.plant.ajuste_dias || 0)
})

// Calcula percentagem de progresso
const progressPercent = computed(() => {
  if (!props.plant) return 0
  return Math.min(100, (daysElapsed.value / props.plant.ciclo_total) * 100)
})

// Determina o estágio de crescimento (1-4)
const growthStage = computed(() => {
  const progress = progressPercent.value
  if (progress < 25) return 1
  if (progress < 50) return 2
  if (progress < 75) return 3
  return 4
})

// Emoji correspondente ao estágio
const stageEmoji = computed(() => {
  const emojis = ['🌱', '🌿', '🪴', '🌸']
  return emojis[growthStage.value - 1]
})

// Sprite atual baseado no estágio (PNG)
const currentSprite = computed(() => {
  return `/assets/sprites/stage_${growthStage.value}.png`
})

// Estilo da sombra (cresce com a planta)
const shadowStyle = computed(() => {
  const baseSize = 20 + (growthStage.value * 15)
  return {
    width: `${baseSize}px`,
    height: `${baseSize / 2}px`,
    opacity: 0.3 + (growthStage.value * 0.1)
  }
})

// Gera posições aleatórias para partículas de terra
const getParticleStyle = (index) => {
  const seed = index * 7
  return {
    left: `${(seed * 13) % 85 + 5}%`,
    top: `${(seed * 17) % 75 + 15}%`,
    width: `${3 + (seed % 5)}px`,
    height: `${2 + (seed % 4)}px`,
    opacity: 0.4 + ((seed % 4) * 0.1),
    transform: `rotate(${seed * 23}deg)`,
    background: `hsl(25, ${30 + (seed % 20)}%, ${20 + (seed % 15)}%)`
  }
}

// Gera posições para pedras pequenas
const getPebbleStyle = (index) => {
  const seed = index * 11 + 3
  return {
    left: `${(seed * 19) % 80 + 10}%`,
    top: `${(seed * 23) % 70 + 20}%`,
    width: `${4 + (seed % 6)}px`,
    height: `${3 + (seed % 4)}px`,
    opacity: 0.6 + ((seed % 3) * 0.1),
    transform: `rotate(${seed * 31}deg)`,
    borderRadius: `${40 + (seed % 30)}%`
  }
}

// Abre modal para adicionar planta
const openAddModal = () => {
  store.openAddPlantModal(props.floorNumber, props.slotIndex)
}

// Click no slot ocupado
const handleClick = () => {
  if (props.plant) {
    store.selectPlant(props.plant)
  }
}
</script>

<style scoped>
/* Wrapper do slot */
.plant-slot-wrapper {
  position: relative;
  aspect-ratio: 1;
  cursor: pointer;
}

/* Container 3D */
.plant-slot-3d {
  position: relative;
  width: 100%;
  height: 100%;
  transition: all 0.3s ease;
  border-radius: 12px;
  overflow: visible;
}

.plant-slot-3d.slot-hover {
  transform: scale(1.05);
  z-index: 20;
}

/* Buraco/Depressão base */
.soil-hole {
  position: absolute;
  inset: -4px;
  background: #1a1208;
  border-radius: 14px;
  z-index: -1;
}

.hole-shadow {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 
    inset 0 4px 12px rgba(0,0,0,0.8),
    inset 0 -2px 6px rgba(255,255,255,0.02);
}

/* CAMADA 1: Terra 3D */
.soil-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: 10px;
  overflow: hidden;
  transform: translateZ(0);
}

.soil-base {
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(
      ellipse 120% 100% at 50% 110%,
      #6B4423 0%,
      #5C4033 30%,
      #4A3525 60%,
      #3D2B1F 100%
    );
}

.soil-texture {
  position: absolute;
  inset: 0;
  /* Textura granulada SVG noise */
  background-image: 
    url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.15'/%3E%3C/svg%3E");
  mix-blend-mode: overlay;
}

.soil-depth-shadow {
  position: absolute;
  inset: 0;
  /* Sombra de profundidade do buraco */
  box-shadow: 
    inset 0 8px 20px rgba(0,0,0,0.7),
    inset 0 -4px 10px rgba(90,70,50,0.3),
    inset 4px 0 15px rgba(0,0,0,0.5),
    inset -4px 0 15px rgba(0,0,0,0.5),
    inset 0 0 30px rgba(0,0,0,0.4);
  border-radius: inherit;
}

/* Borda elevada da terra */
.soil-rim {
  position: absolute;
  inset: 0;
  border: 3px solid transparent;
  border-radius: inherit;
  background: 
    linear-gradient(
      180deg,
      rgba(90,70,50,0.6) 0%,
      transparent 30%,
      transparent 80%,
      rgba(60,45,30,0.4) 100%
    );
  background-clip: padding-box;
  pointer-events: none;
}

.soil-rim::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 10%;
  right: 10%;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(139,115,85,0.4) 30%,
    rgba(139,115,85,0.5) 50%,
    rgba(139,115,85,0.4) 70%,
    transparent
  );
  border-radius: 2px;
}

/* Partículas de terra */
.soil-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.particle {
  position: absolute;
  background: linear-gradient(135deg, #6B4423 0%, #4A3525 100%);
  border-radius: 40%;
  box-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

/* Pedras */
.soil-pebbles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.pebble {
  position: absolute;
  background: linear-gradient(145deg, #7a7a7a 0%, #4a4a4a 50%, #3a3a3a 100%);
  box-shadow: 
    0 1px 2px rgba(0,0,0,0.4),
    inset 0 1px 1px rgba(255,255,255,0.1);
}

/* CAMADA 2: Planta 3D */
.plant-layer {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 5%;
  pointer-events: none;
}

/* Sombra da planta no chão - elipse realista */
.plant-shadow-ground {
  position: absolute;
  bottom: 8%;
  left: 50%;
  transform: translateX(-50%);
  background: radial-gradient(
    ellipse at center,
    rgba(0,0,0,0.5) 0%,
    rgba(0,0,0,0.3) 40%,
    transparent 70%
  );
  border-radius: 50%;
  filter: blur(3px);
}

.plant-sprite-container {
  position: relative;
  max-width: 85%;
  max-height: 90%;
  transform-origin: bottom center;
}

.plant-sprite {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
}

.plant-highlight {
  position: absolute;
  top: 10%;
  left: 20%;
  width: 30%;
  height: 20%;
  background: radial-gradient(
    ellipse at center,
    rgba(255,255,255,0.15) 0%,
    transparent 70%
  );
  pointer-events: none;
}

/* CAMADA 3: Interação */
.interaction-layer {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: inherit;
}

/* Botão Adicionar 3D */
.add-button {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 18px;
  background: transparent;
  border: none;
  cursor: pointer;
  opacity: 0;
  transform: translateY(10px) scale(0.9);
  transition: all 0.3s ease;
}

.slot-empty:hover .add-button {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.add-button-bg {
  position: absolute;
  inset: 0;
  background: rgba(34,139,34,0.2);
  border: 2px dashed rgba(34,139,34,0.5);
  border-radius: 14px;
  transition: all 0.3s ease;
}

.add-button:hover .add-button-bg {
  background: rgba(34,139,34,0.35);
  border-color: rgba(34,139,34,0.8);
  box-shadow: 
    0 0 20px rgba(34,139,34,0.3),
    inset 0 0 20px rgba(34,139,34,0.1);
}

.add-icon {
  font-size: 28px;
  font-weight: bold;
  color: #32CD32;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  position: relative;
  z-index: 1;
}

.add-text {
  font-size: 12px;
  color: #32CD32;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  position: relative;
  z-index: 1;
}

/* Info Card 3D */
.plant-info {
  position: absolute;
  bottom: 105%;
  left: 50%;
  transform: translateX(-50%) translateY(15px) scale(0.9);
  opacity: 0;
  pointer-events: none;
  transition: all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  z-index: 100;
}

.plant-info--visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
}

.info-card {
  position: relative;
  background: linear-gradient(
    180deg,
    rgba(26,47,35,0.98) 0%,
    rgba(20,40,30,0.98) 100%
  );
  backdrop-filter: blur(12px);
  border: 1px solid rgba(34,139,34,0.4);
  border-radius: 16px;
  padding: 14px 18px;
  min-width: 170px;
  box-shadow: 
    0 10px 40px rgba(0,0,0,0.5),
    0 0 20px rgba(34,139,34,0.15),
    inset 0 1px 0 rgba(255,255,255,0.1);
}

.info-card-glow {
  position: absolute;
  top: -1px;
  left: 20%;
  right: 20%;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(34,139,34,0.6),
    transparent
  );
}

.info-card::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  border: 8px solid transparent;
  border-top-color: rgba(26,47,35,0.98);
}

.info-name {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 10px;
  text-align: center;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

.info-stats {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 10px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(255,255,255,0.85);
}

.stat-icon {
  font-size: 13px;
}

/* Barra de progresso 3D */
.progress-bar-3d {
  position: relative;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
}

.progress-track {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.4);
  border-radius: inherit;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.4);
}

.progress-fill {
  position: relative;
  height: 100%;
  background: linear-gradient(
    180deg,
    #3CB371 0%,
    #228B22 50%,
    #1a6b1a 100%
  );
  border-radius: inherit;
  transition: width 0.4s ease;
  box-shadow: 
    0 0 8px rgba(34,139,34,0.5),
    inset 0 1px 0 rgba(255,255,255,0.3);
}

.progress-shine {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(
    180deg,
    rgba(255,255,255,0.3) 0%,
    transparent 100%
  );
  border-radius: inherit;
}

/* Badge de Estágio 3D */
.stage-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  z-index: 4;
  box-shadow: 
    0 2px 8px rgba(0,0,0,0.4),
    inset 0 1px 0 rgba(255,255,255,0.2),
    inset 0 -1px 0 rgba(0,0,0,0.2);
}

.badge-emoji {
  font-size: 14px;
  position: relative;
  z-index: 1;
}

.badge-glow {
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.slot-hover .badge-glow {
  opacity: 1;
}

.stage-1 { 
  background: linear-gradient(145deg, #8B5A2B 0%, #6B4423 100%);
}
.stage-1 .badge-glow { box-shadow: 0 0 15px rgba(139,90,43,0.6); }

.stage-2 { 
  background: linear-gradient(145deg, #3CB371 0%, #228B22 100%);
}
.stage-2 .badge-glow { box-shadow: 0 0 15px rgba(34,139,34,0.6); }

.stage-3 { 
  background: linear-gradient(145deg, #32CD32 0%, #228B22 100%);
}
.stage-3 .badge-glow { box-shadow: 0 0 15px rgba(50,205,50,0.6); }

.stage-4 { 
  background: linear-gradient(145deg, #FFD700 0%, #FFA500 100%);
}
.stage-4 .badge-glow { box-shadow: 0 0 15px rgba(255,165,0,0.6); }

/* Efeito de glow no hover */
.slot-glow {
  position: absolute;
  inset: -4px;
  border-radius: 14px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.4s ease;
  box-shadow: 
    0 0 20px rgba(34,139,34,0.4),
    0 0 40px rgba(34,139,34,0.2),
    inset 0 0 20px rgba(34,139,34,0.1);
}

.slot-glow.glow-active {
  opacity: 1;
}

/* Animações */
@keyframes sprout-3d {
  0% {
    transform: scale(0) translateY(30px) rotateX(-20deg);
    opacity: 0;
  }
  50% {
    transform: scale(1.1) translateY(-8px) rotateX(5deg);
  }
  100% {
    transform: scale(1) translateY(0) rotateX(0deg);
    opacity: 1;
  }
}

.animate-sprout {
  animation: sprout-3d 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes sway-3d {
  0%, 100% {
    transform: rotate(-1.5deg) translateX(-1px);
  }
  50% {
    transform: rotate(1.5deg) translateX(1px);
  }
}

.animate-sway {
  animation: sway-3d 4s ease-in-out infinite;
}
</style>
