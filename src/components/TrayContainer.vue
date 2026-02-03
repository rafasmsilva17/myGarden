<template>
  <!-- Contentor Principal do Tabuleiro - Visual 3D Ultra Realista -->
  <div class="tray-container">
    <!-- Cena 3D -->
    <div class="tray-scene">
      <!-- Estrutura exterior do tabuleiro (bordas de madeira) -->
      <div class="tray-frame">
        <!-- Face superior do tabuleiro -->
        <div class="tray-top-face">
          <div class="wood-grain"></div>
        </div>
        
        <!-- Borda superior com efeito 3D -->
        <div class="tray-border-top">
          <div class="tray-border-highlight"></div>
        </div>
        
        <!-- Laterais do tabuleiro -->
        <div class="tray-body">
          <!-- Borda esquerda com profundidade -->
          <div class="tray-side tray-side-left">
            <div class="wood-texture"></div>
            <div class="side-shadow"></div>
          </div>
          
          <!-- Área interior com terra - onde ficam os slots -->
          <div class="tray-interior">
            <!-- Múltiplas camadas de sombra para profundidade -->
            <div class="tray-shadow-layer-1"></div>
            <div class="tray-shadow-layer-2"></div>
            <div class="tray-shadow-layer-3"></div>
            
            <!-- Reflexo de luz ambiente -->
            <div class="tray-ambient-light"></div>
            
            <!-- Grelha de slots -->
            <div 
              class="slots-grid"
              :style="{ 
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`
              }"
            >
              <slot></slot>
            </div>
          </div>
          
          <!-- Borda direita com profundidade -->
          <div class="tray-side tray-side-right">
            <div class="wood-texture"></div>
            <div class="side-highlight"></div>
          </div>
        </div>
        
        <!-- Borda inferior com sombra projetada -->
        <div class="tray-border-bottom">
          <div class="tray-border-shadow"></div>
        </div>
        
        <!-- Face frontal do tabuleiro (espessura visível) -->
        <div class="tray-front-face"></div>
      </div>
    </div>
    
    <!-- Sombra projetada no chão (múltiplas camadas) -->
    <div class="tray-ground-shadow">
      <div class="shadow-layer-1"></div>
      <div class="shadow-layer-2"></div>
    </div>
    
    <!-- Reflexo subtil -->
    <div class="tray-reflection"></div>
  </div>
</template>

<script setup>
defineProps({
  columns: {
    type: Number,
    default: 6
  },
  rows: {
    type: Number,
    default: 2
  }
})
</script>

<style scoped>
.tray-container {
  position: relative;
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  perspective: 1200px;
  perspective-origin: 50% 30%;
}

/* Cena 3D */
.tray-scene {
  transform-style: preserve-3d;
  transform: rotateX(12deg) rotateY(0deg);
  transition: transform 0.5s ease;
}

.tray-container:hover .tray-scene {
  transform: rotateX(8deg) rotateY(1deg);
}

/* Frame exterior - madeira envelhecida 3D */
.tray-frame {
  position: relative;
  transform-style: preserve-3d;
}

/* Face superior do tabuleiro (topo da borda) */
.tray-top-face {
  position: absolute;
  top: -8px;
  left: 0;
  right: 0;
  height: 8px;
  background: linear-gradient(
    180deg,
    #9B8465 0%,
    #7B6445 100%
  );
  transform: rotateX(-90deg) translateZ(0px);
  transform-origin: bottom;
  border-radius: 4px 4px 0 0;
}

.wood-grain {
  position: absolute;
  inset: 0;
  background-image: 
    repeating-linear-gradient(
      90deg,
      transparent 0px,
      rgba(0,0,0,0.05) 3px,
      transparent 6px
    ),
    repeating-linear-gradient(
      0deg,
      transparent 0px,
      rgba(139,115,85,0.15) 15px,
      transparent 30px
    );
  border-radius: inherit;
}

/* Borda superior - efeito de profundidade 3D */
.tray-border-top {
  height: 18px;
  position: relative;
  background: linear-gradient(
    180deg,
    #A08060 0%,
    #8B7355 20%,
    #6B5344 60%,
    #5D4E37 100%
  );
  border-radius: 8px 8px 0 0;
  box-shadow: 
    inset 0 3px 0 rgba(255,255,255,0.15),
    inset 0 -3px 6px rgba(0,0,0,0.3),
    0 -4px 12px rgba(0,0,0,0.2);
  /* Textura de madeira realista */
  background-image: 
    repeating-linear-gradient(
      95deg,
      transparent,
      transparent 30px,
      rgba(0,0,0,0.03) 30px,
      rgba(0,0,0,0.05) 32px,
      transparent 34px,
      transparent 80px
    ),
    repeating-linear-gradient(
      87deg,
      transparent,
      rgba(139,115,85,0.1) 100px
    );
}

.tray-border-highlight {
  position: absolute;
  top: 0;
  left: 10px;
  right: 10px;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255,255,255,0.25) 20%,
    rgba(255,255,255,0.35) 50%,
    rgba(255,255,255,0.25) 80%,
    transparent 100%
  );
  border-radius: 2px;
}

/* Corpo principal do tabuleiro */
.tray-body {
  display: flex;
  position: relative;
  transform-style: preserve-3d;
}

/* Laterais do tabuleiro - 3D com espessura */
.tray-side {
  width: 20px;
  position: relative;
  transform-style: preserve-3d;
}

.tray-side-left {
  background: linear-gradient(
    90deg,
    #3D2B1F 0%,
    #4A3728 20%,
    #5D4E37 50%,
    #6B5344 100%
  );
  border-left: 3px solid #2D1F15;
  box-shadow: 
    inset -4px 0 12px rgba(0,0,0,0.5),
    inset 0 4px 8px rgba(0,0,0,0.3);
}

.tray-side-left::before {
  content: '';
  position: absolute;
  left: -12px;
  top: 0;
  bottom: 0;
  width: 12px;
  background: linear-gradient(
    90deg,
    #2D1F15 0%,
    #3D2B1F 100%
  );
  transform: rotateY(-90deg) translateZ(0px);
  transform-origin: right;
}

.tray-side-right {
  background: linear-gradient(
    90deg,
    #6B5344 0%,
    #5D4E37 50%,
    #4A3728 80%,
    #3D2B1F 100%
  );
  border-right: 3px solid #2D1F15;
  box-shadow: 
    inset 4px 0 12px rgba(0,0,0,0.4),
    inset 0 4px 8px rgba(0,0,0,0.3);
}

.tray-side-right::before {
  content: '';
  position: absolute;
  right: -12px;
  top: 0;
  bottom: 0;
  width: 12px;
  background: linear-gradient(
    90deg,
    #4A3728 0%,
    #3D2B1F 100%
  );
  transform: rotateY(90deg) translateZ(0px);
  transform-origin: left;
}

.wood-texture {
  position: absolute;
  inset: 0;
  background-image: 
    repeating-linear-gradient(
      180deg,
      transparent 0px,
      rgba(0,0,0,0.03) 10px,
      transparent 20px
    );
  pointer-events: none;
}

.side-shadow {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 10px;
  background: linear-gradient(90deg, transparent, rgba(0,0,0,0.25));
}

.side-highlight {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(90deg, rgba(255,255,255,0.12), transparent);
}

/* Interior do tabuleiro - área de terra 3D com profundidade real */
.tray-interior {
  flex: 1;
  position: relative;
  min-height: 220px;
  background: #3D2B1F;
  /* Gradiente para simular profundidade da terra */
  background: 
    radial-gradient(
      ellipse at 50% 0%,
      #2D1F15 0%,
      #3D2B1F 40%,
      #4A3525 100%
    );
  /* Sombras internas múltiplas para profundidade real */
  box-shadow: 
    inset 0 15px 30px rgba(0,0,0,0.7),
    inset 0 -8px 20px rgba(0,0,0,0.4),
    inset 8px 0 20px rgba(0,0,0,0.5),
    inset -8px 0 20px rgba(0,0,0,0.5),
    inset 0 0 60px rgba(0,0,0,0.3);
  /* Borda interior para definir profundidade */
  border: 4px solid #2D1F15;
  border-top-width: 6px;
}

/* Múltiplas camadas de sombra para profundidade extrema */
.tray-shadow-layer-1 {
  position: absolute;
  inset: 0;
  background: 
    linear-gradient(
      180deg,
      rgba(0,0,0,0.5) 0%,
      rgba(0,0,0,0.2) 30%,
      transparent 60%
    );
  pointer-events: none;
  z-index: 1;
}

.tray-shadow-layer-2 {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 40%;
  background: 
    radial-gradient(
      ellipse 80% 100% at 50% 0%,
      rgba(0,0,0,0.4) 0%,
      transparent 70%
    );
  pointer-events: none;
  z-index: 1;
}

.tray-shadow-layer-3 {
  position: absolute;
  inset: 0;
  box-shadow: 
    inset 20px 20px 40px rgba(0,0,0,0.3),
    inset -20px 20px 40px rgba(0,0,0,0.3);
  pointer-events: none;
  z-index: 1;
  border-radius: 4px;
}

/* Luz ambiente reflectida no canto */
.tray-ambient-light {
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 100px;
  height: 60px;
  background: radial-gradient(
    ellipse at center,
    rgba(255,255,255,0.03) 0%,
    transparent 70%
  );
  pointer-events: none;
  z-index: 1;
}

/* Grelha de slots */
.slots-grid {
  display: grid;
  gap: 12px;
  padding: 20px;
  position: relative;
  z-index: 2;
  height: 100%;
  min-height: 200px;
}

/* Borda inferior - 3D com face frontal visível */
.tray-border-bottom {
  height: 20px;
  position: relative;
  background: linear-gradient(
    180deg,
    #5D4E37 0%,
    #4A3728 40%,
    #3D2B1F 100%
  );
  border-radius: 0 0 6px 6px;
  box-shadow: 
    inset 0 3px 6px rgba(0,0,0,0.4),
    inset 0 -2px 0 rgba(0,0,0,0.2);
  /* Textura de madeira */
  background-image: 
    repeating-linear-gradient(
      92deg,
      transparent,
      transparent 50px,
      rgba(0,0,0,0.04) 50px,
      rgba(0,0,0,0.06) 52px,
      transparent 54px
    );
}

.tray-border-shadow {
  position: absolute;
  bottom: -4px;
  left: 5%;
  right: 5%;
  height: 4px;
  background: linear-gradient(
    180deg,
    rgba(0,0,0,0.3) 0%,
    transparent 100%
  );
}

/* Face frontal do tabuleiro (espessura 3D) */
.tray-front-face {
  position: absolute;
  bottom: -15px;
  left: 0;
  right: 0;
  height: 15px;
  background: linear-gradient(
    180deg,
    #4A3728 0%,
    #3D2B1F 60%,
    #2D1F15 100%
  );
  transform: rotateX(90deg);
  transform-origin: top;
  border-radius: 0 0 4px 4px;
  box-shadow: 
    inset 0 2px 4px rgba(0,0,0,0.4),
    0 4px 8px rgba(0,0,0,0.5);
}

/* Sombra projetada no suporte - múltiplas camadas */
.tray-ground-shadow {
  position: absolute;
  bottom: -35px;
  left: 5%;
  right: 5%;
  height: 35px;
  pointer-events: none;
}

.shadow-layer-1 {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 100% 80% at 50% 0%,
    rgba(0,0,0,0.5) 0%,
    transparent 70%
  );
  filter: blur(10px);
}

.shadow-layer-2 {
  position: absolute;
  top: 5px;
  left: 10%;
  right: 10%;
  bottom: 5px;
  background: radial-gradient(
    ellipse at center,
    rgba(0,0,0,0.3) 0%,
    transparent 60%
  );
  filter: blur(15px);
}

/* Reflexo subtil */
.tray-reflection {
  position: absolute;
  bottom: -60px;
  left: 15%;
  right: 15%;
  height: 30px;
  background: linear-gradient(
    180deg,
    rgba(74,55,40,0.1) 0%,
    transparent 100%
  );
  filter: blur(8px);
  opacity: 0.5;
  transform: scaleY(-1);
}

/* Responsividade */
@media (max-width: 768px) {
  .tray-border-top {
    height: 14px;
  }
  
  .tray-border-bottom {
    height: 14px;
  }
  
  .tray-side {
    width: 14px;
  }
  
  .slots-grid {
    padding: 12px;
    gap: 8px;
  }
  
  .tray-scene {
    transform: rotateX(8deg);
  }
  
  .tray-front-face {
    height: 10px;
    bottom: -10px;
  }
}
</style>
