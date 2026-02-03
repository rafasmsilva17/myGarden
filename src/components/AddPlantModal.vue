<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click.self="close">
        <div class="modal-container">
          <!-- Header -->
          <div class="modal-header">
            <div class="header-icon">🌱</div>
            <h2 class="header-title">Adicionar Nova Planta</h2>
            <button class="close-btn" @click="close">✕</button>
          </div>

          <!-- Informação do Slot -->
          <div class="slot-info">
            <span class="slot-badge">
              📍 {{ modalData.floorNumber }}º Andar - Slot #{{ modalData.slotIndex + 1 }}
            </span>
          </div>

          <!-- Formulário -->
          <form @submit.prevent="handleSubmit" class="modal-form">
            <!-- Nome da Planta (com sugestões) -->
            <div class="form-group">
              <label class="form-label">Nome da Planta</label>
              <div class="input-with-suggestions">
                <input
                  v-model="plantName"
                  type="text"
                  class="form-input"
                  placeholder="Ex: Manjericão, Tomate, Alface..."
                  @input="onInputChange"
                  @focus="showSuggestions = true"
                  required
                />
                <!-- Sugestões -->
                <div v-if="showSuggestions && filteredSuggestions.length" class="suggestions-dropdown">
                  <button
                    v-for="suggestion in filteredSuggestions"
                    :key="suggestion"
                    type="button"
                    class="suggestion-item"
                    @click="selectSuggestion(suggestion)"
                  >
                    {{ suggestion }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Botão para buscar dados da IA -->
            <button
              type="button"
              class="ai-lookup-btn"
              @click="lookupPlantData"
              :disabled="!plantName || isLookingUp"
            >
              <span v-if="!isLookingUp">🤖 Obter dados da planta via IA</span>
              <span v-else>⏳ A consultar IA...</span>
            </button>

            <!-- Dados obtidos da IA (ou manuais) -->
            <div class="ai-data-section" :class="{ 'has-data': hasAIData }">
              <div v-if="hasAIData" class="ai-badge">
                ✨ Dados obtidos via IA
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Ciclo Total (dias)</label>
                  <input
                    v-model.number="cicloTotal"
                    type="number"
                    class="form-input"
                    min="1"
                    max="365"
                    required
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Humidade Alvo (%)</label>
                  <input
                    v-model.number="targetHumidity"
                    type="number"
                    class="form-input"
                    min="0"
                    max="100"
                    required
                  />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Ajuste de Dias</label>
                  <input
                    v-model.number="ajusteDias"
                    type="number"
                    class="form-input"
                    min="-30"
                    max="30"
                  />
                  <span class="form-hint">Ajusta se a planta já está crescida</span>
                </div>

                <div class="form-group">
                  <label class="form-label">Data de Início</label>
                  <input
                    v-model="dataInicio"
                    type="date"
                    class="form-input"
                    required
                  />
                </div>
              </div>

              <!-- Info adicional da IA -->
              <div v-if="aiDescription" class="ai-description">
                <h4>📝 Dicas da IA:</h4>
                <p>{{ aiDescription }}</p>
              </div>
            </div>

            <!-- Preview da Planta -->
            <div class="plant-preview">
              <h4>Preview do Crescimento</h4>
              <div class="preview-stages">
                <div 
                  v-for="stage in 4" 
                  :key="stage"
                  class="preview-stage"
                  :class="{ 'preview-stage--active': previewStage >= stage }"
                >
                  <img 
                    :src="`/assets/sprites/stage_${stage}.png`" 
                    :alt="`Estágio ${stage}`"
                    class="stage-preview-img"
                  />
                  <span class="stage-label">{{ stageNames[stage - 1] }}</span>
                </div>
              </div>
              <div class="preview-info">
                <span>Baseado em {{ cicloTotal }} dias de ciclo</span>
              </div>
            </div>

            <!-- Botões de Ação -->
            <div class="modal-actions">
              <button type="button" class="btn-cancel" @click="close">
                Cancelar
              </button>
              <button 
                type="submit" 
                class="btn-submit"
                :disabled="!canSubmit || isSubmitting"
              >
                <span v-if="!isSubmitting">🌱 Plantar</span>
                <span v-else>⏳ A plantar...</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useGreenhouseStore } from '@/stores/greenhouse'

const store = useGreenhouseStore()

// Estado do modal
const isOpen = computed(() => store.addPlantModal.isOpen)
const modalData = computed(() => store.addPlantModal)

// Campos do formulário
const plantName = ref('')
const cicloTotal = ref(60)
const targetHumidity = ref(65)
const ajusteDias = ref(0)
const dataInicio = ref(new Date().toISOString().split('T')[0])

// Estados de loading
const isLookingUp = ref(false)
const isSubmitting = ref(false)
const hasAIData = ref(false)
const aiDescription = ref('')

// Sugestões
const showSuggestions = ref(false)

// Base de dados de plantas com valores pré-definidos
const plantDatabase = {
  'Manjericão': { ciclo: 60, humidade: 65, descricao: 'Erva aromática. Prefere sol direto e solo húmido mas bem drenado.' },
  'Tomate Cherry': { ciclo: 90, humidade: 70, descricao: 'Necessita muito sol (6-8h). Regar regularmente sem encharcar.' },
  'Alface': { ciclo: 45, humidade: 70, descricao: 'Cultura rápida. Prefere temperaturas amenas e solo sempre húmido.' },
  'Rúcula': { ciclo: 40, humidade: 65, descricao: 'Crescimento rápido. Tolera sombra parcial. Colher folhas jovens.' },
  'Espinafre': { ciclo: 50, humidade: 70, descricao: 'Prefere clima fresco. Regar frequentemente, evitar calor intenso.' },
  'Salsa': { ciclo: 75, humidade: 65, descricao: 'Germinação lenta. Manter solo húmido. Sol ou meia-sombra.' },
  'Coentros': { ciclo: 55, humidade: 60, descricao: 'Cresce rápido em clima fresco. Evitar transplante, semear direto.' },
  'Hortelã': { ciclo: 70, humidade: 70, descricao: 'Muito invasiva. Solo húmido. Cresce bem em sombra parcial.' },
  'Cebolinho': { ciclo: 80, humidade: 60, descricao: 'Perene resistente. Cortar regularmente para estimular crescimento.' },
  'Morango': { ciclo: 120, humidade: 70, descricao: 'Necessita sol pleno. Manter solo húmido. Frutos após 3-4 meses.' },
  'Pimento': { ciclo: 100, humidade: 65, descricao: 'Necessita calor e sol. Regar regularmente. Sensível ao frio.' },
  'Pepino': { ciclo: 70, humidade: 75, descricao: 'Necessita muito água e calor. Trepar em suporte.' },
  'Couve': { ciclo: 85, humidade: 70, descricao: 'Tolera frio. Solo rico. Regar regularmente.' },
  'Agrião': { ciclo: 35, humidade: 80, descricao: 'Adora água. Crescimento muito rápido. Colher cedo.' },
  'Orégãos': { ciclo: 65, humidade: 55, descricao: 'Mediterrâneo. Prefere solo seco. Sol pleno.' },
  // Pimentos picantes
  'Habanero': { ciclo: 120, humidade: 60, descricao: 'Pimento muito picante. Necessita calor intenso e sol pleno. Regar moderadamente.' },
  'Jalapeño': { ciclo: 90, humidade: 65, descricao: 'Pimento picante médio. Sol pleno. Solo bem drenado.' },
  'Carolina Reaper': { ciclo: 130, humidade: 60, descricao: 'O mais picante do mundo! Necessita muito calor e paciência.' },
  'Cayenne': { ciclo: 85, humidade: 60, descricao: 'Pimento picante versátil. Sol pleno, solo bem drenado.' },
  'Tabasco': { ciclo: 100, humidade: 65, descricao: 'Pimento para molhos. Muito produtivo com calor adequado.' },
  'Piri-Piri': { ciclo: 95, humidade: 60, descricao: 'Pimento africano picante. Resistente ao calor, sol pleno.' },
  'Malagueta': { ciclo: 90, humidade: 60, descricao: 'Popular no Brasil. Sol pleno, regar com moderação.' },
  // Outras
  'Tomate': { ciclo: 100, humidade: 70, descricao: 'Clássico da horta. Sol pleno 6-8h. Tutorar as plantas.' },
  'Cenoura': { ciclo: 75, humidade: 65, descricao: 'Solo solto e profundo. Desbastar para cenouras maiores.' },
  'Beterraba': { ciclo: 60, humidade: 70, descricao: 'Raiz e folhas comestíveis. Solo solto sem pedras.' },
  'Rabanete': { ciclo: 30, humidade: 70, descricao: 'Mais rápido da horta! Pronto em 4 semanas.' },
  'Feijão Verde': { ciclo: 65, humidade: 65, descricao: 'Trepador. Colher regularmente para mais produção.' },
  'Ervilha': { ciclo: 70, humidade: 70, descricao: 'Prefere clima fresco. Precisa de suporte para trepar.' }
}

const plantSuggestions = Object.keys(plantDatabase)

const filteredSuggestions = computed(() => {
  if (!plantName.value) return plantSuggestions.slice(0, 8)
  const search = plantName.value.toLowerCase()
  return plantSuggestions
    .filter(s => s.toLowerCase().includes(search))
    .slice(0, 8)
})

// Nomes dos estágios
const stageNames = ['Rebento', 'Jovem', 'Adulta', 'Floração']

// Preview do estágio baseado no ajuste
const previewStage = computed(() => {
  const progress = (ajusteDias.value / cicloTotal.value) * 100
  if (progress < 25) return 1
  if (progress < 50) return 2
  if (progress < 75) return 3
  return 4
})

// Validação
const canSubmit = computed(() => {
  return plantName.value && cicloTotal.value > 0 && targetHumidity.value > 0
})

// Selecionar sugestão e preencher dados automaticamente
const selectSuggestion = (suggestion) => {
  plantName.value = suggestion
  showSuggestions.value = false
  
  // Preencher automaticamente com dados da base de dados
  const plantData = plantDatabase[suggestion]
  if (plantData) {
    cicloTotal.value = plantData.ciclo
    targetHumidity.value = plantData.humidade
    aiDescription.value = plantData.descricao
    hasAIData.value = true
    store.showToast(`Dados de "${suggestion}" carregados!`, 'success')
  }
}

// Input change - verificar se corresponde a uma planta conhecida
const onInputChange = () => {
  // Verificar se o texto corresponde exatamente a uma planta da base de dados
  const exactMatch = plantSuggestions.find(
    p => p.toLowerCase() === plantName.value.toLowerCase()
  )
  
  if (exactMatch && plantDatabase[exactMatch]) {
    const plantData = plantDatabase[exactMatch]
    cicloTotal.value = plantData.ciclo
    targetHumidity.value = plantData.humidade
    aiDescription.value = plantData.descricao
    hasAIData.value = true
  } else {
    // Se não encontrar, não limpar os dados (permite edição manual)
    if (!plantName.value) {
      hasAIData.value = false
      aiDescription.value = ''
    }
  }
}

// Buscar dados da IA
const lookupPlantData = async () => {
  if (!plantName.value) return
  
  isLookingUp.value = true
  try {
    const data = await store.lookupPlantAI(plantName.value)
    if (data) {
      cicloTotal.value = data.ciclo_total || 60
      targetHumidity.value = data.targets_humidade || 65
      aiDescription.value = data.descricao || ''
      hasAIData.value = true
      store.showToast(`Dados de "${plantName.value}" obtidos com sucesso!`, 'success')
    }
  } catch (error) {
    store.showToast('Erro ao consultar IA. Use valores manuais.', 'error')
  } finally {
    isLookingUp.value = false
  }
}

// Submeter formulário
const handleSubmit = async () => {
  if (!canSubmit.value) return
  
  isSubmitting.value = true
  try {
    await store.addPlant({
      nome: plantName.value,
      andar: modalData.value.floorNumber,
      slot_index: modalData.value.slotIndex,
      data_inicio: dataInicio.value,
      ajuste_dias: ajusteDias.value,
      ciclo_total: cicloTotal.value,
      targets_humidade: targetHumidity.value
    })
    store.showToast(`${plantName.value} plantado com sucesso!`, 'success')
    close()
  } catch (error) {
    store.showToast('Erro ao adicionar planta', 'error')
  } finally {
    isSubmitting.value = false
  }
}

// Fechar modal
const close = () => {
  store.closeAddPlantModal()
}

// Reset ao abrir
watch(isOpen, (newVal) => {
  if (newVal) {
    plantName.value = ''
    cicloTotal.value = 60
    targetHumidity.value = 65
    ajusteDias.value = 0
    dataInicio.value = new Date().toISOString().split('T')[0]
    hasAIData.value = false
    aiDescription.value = ''
    showSuggestions.value = false
  }
})

// Fechar sugestões ao clicar fora
const handleClickOutside = (e) => {
  if (!e.target.closest('.input-with-suggestions')) {
    showSuggestions.value = false
  }
}

if (typeof window !== 'undefined') {
  document.addEventListener('click', handleClickOutside)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-container {
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  background: linear-gradient(180deg, #1a2f23 0%, #0d1f15 100%);
  border: 1px solid rgba(34,139,34,0.3);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}

/* Header */
.modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.header-icon {
  font-size: 32px;
}

.header-title {
  flex: 1;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
}

.close-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.1);
  border: none;
  border-radius: 50%;
  color: rgba(255,255,255,0.6);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255,255,255,0.2);
  color: #fff;
}

/* Slot Info */
.slot-info {
  padding: 12px 24px;
}

.slot-badge {
  display: inline-block;
  padding: 6px 12px;
  background: rgba(34,139,34,0.2);
  border: 1px solid rgba(34,139,34,0.3);
  border-radius: 20px;
  color: #32CD32;
  font-size: 13px;
  font-weight: 600;
}

/* Formulário */
.modal-form {
  padding: 20px 24px;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,0.8);
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: rgba(34,139,34,0.5);
  box-shadow: 0 0 0 3px rgba(34,139,34,0.1);
}

.form-hint {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: rgba(255,255,255,0.4);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* Sugestões */
.input-with-suggestions {
  position: relative;
}

.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: #1a2f23;
  border: 1px solid rgba(34,139,34,0.3);
  border-radius: 10px;
  overflow: hidden;
  z-index: 10;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}

.suggestion-item {
  display: block;
  width: 100%;
  padding: 10px 16px;
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.8);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
}

.suggestion-item:hover {
  background: rgba(34,139,34,0.2);
  color: #fff;
}

/* AI Lookup Button */
.ai-lookup-btn {
  width: 100%;
  padding: 14px 20px;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #8B5CF6, #6366F1);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.ai-lookup-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(139,92,246,0.4);
}

.ai-lookup-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* AI Data Section */
.ai-data-section {
  padding: 16px;
  background: rgba(0,0,0,0.2);
  border: 1px dashed rgba(255,255,255,0.1);
  border-radius: 12px;
  margin-bottom: 20px;
  transition: all 0.3s;
}

.ai-data-section.has-data {
  border-style: solid;
  border-color: rgba(139,92,246,0.3);
  background: rgba(139,92,246,0.05);
}

.ai-badge {
  display: inline-block;
  padding: 4px 10px;
  margin-bottom: 12px;
  background: rgba(139,92,246,0.2);
  border-radius: 12px;
  color: #A78BFA;
  font-size: 11px;
  font-weight: 600;
}

.ai-description {
  margin-top: 16px;
  padding: 12px;
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
}

.ai-description h4 {
  font-size: 13px;
  color: #A78BFA;
  margin-bottom: 6px;
}

.ai-description p {
  font-size: 13px;
  color: rgba(255,255,255,0.7);
  line-height: 1.5;
}

/* Preview */
.plant-preview {
  padding: 16px;
  background: rgba(34,139,34,0.1);
  border: 1px solid rgba(34,139,34,0.2);
  border-radius: 12px;
  margin-bottom: 20px;
}

.plant-preview h4 {
  font-size: 13px;
  color: rgba(255,255,255,0.6);
  margin-bottom: 12px;
}

.preview-stages {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.preview-stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  opacity: 0.4;
  transition: all 0.3s;
}

.preview-stage--active {
  opacity: 1;
  background: rgba(34,139,34,0.2);
}

.stage-preview-img {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.stage-label {
  font-size: 10px;
  color: rgba(255,255,255,0.6);
}

.preview-info {
  margin-top: 8px;
  text-align: center;
  font-size: 11px;
  color: rgba(255,255,255,0.4);
}

/* Ações */
.modal-actions {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.btn-cancel {
  flex: 1;
  padding: 14px 20px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  color: rgba(255,255,255,0.7);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: rgba(255,255,255,0.15);
}

.btn-submit {
  flex: 1;
  padding: 14px 20px;
  background: linear-gradient(135deg, #228B22, #32CD32);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(34,139,34,0.4);
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Animações */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95) translateY(20px);
}
</style>
