import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import * as supabaseLib from '@/lib/supabase'

const API_BASE = '/.netlify/functions'

// Verificar se está em modo demo
const isDemoMode = () => localStorage.getItem('myGarden_demo') === 'true'

// Helper para localStorage
const loadFromStorage = (key, defaultValue) => {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : defaultValue
  } catch {
    return defaultValue
  }
}

const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn('Erro ao salvar localStorage:', e)
  }
}

export const useGreenhouseStore = defineStore('greenhouse', () => {
  // ========== STATE ==========
  
  // Plantas (carrega do localStorage)
  const plants = ref(loadFromStorage('myGarden_plants', []))
  
  // Dados do sensor da estufa (sensor único para toda a estufa)
  const sensor = ref({
    humidity: 0,
    temperature: 0
  })
  
  // Configuração de notificações
  const notifyTopic = ref(loadFromStorage('myGarden_ntfy', ''))
  
  // Modal de adicionar planta
  const addPlantModal = ref({
    isOpen: false,
    floorNumber: 1,
    slotIndex: 0
  })
  
  // Planta selecionada
  const selectedPlant = ref(null)
  
  // Toasts (notificações)
  const toasts = ref([])
  
  // Loading states
  const isLoading = ref(false)
  
  // Guardar plantas no localStorage quando mudam
  watch(plants, (newPlants) => {
    saveToStorage('myGarden_plants', newPlants)
  }, { deep: true })

  // ========== GETTERS ==========
  
  // Plantas por andar
  const getPlantsByFloor = (floor) => {
    return plants.value.filter(p => p.andar === floor)
  }
  
  // Sensor por andar (retorna o sensor global, pois é único)
  const getSensorByFloor = (floor) => {
    return sensor.value
  }
  
  // Sensor global da estufa
  const getGlobalSensor = () => {
    return sensor.value
  }
  
  // Total de plantas
  const totalPlants = computed(() => plants.value.length)
  
  // Plantas que precisam de água
  const plantsNeedingWater = computed(() => {
    return plants.value.filter(plant => {
      const sensor = sensors.value[plant.andar]
      if (!sensor) return false
      return sensor.humidity < plant.targets_humidade - 5
    })
  })

  // ========== ACTIONS ==========
  
  // Mostrar toast
  const showToast = (message, type = 'info') => {
    const id = Date.now()
    toasts.value.push({ id, message, type })
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, 4000)
  }
  
  // Abrir modal de adicionar planta
  const openAddPlantModal = (floorNumber, slotIndex) => {
    addPlantModal.value = {
      isOpen: true,
      floorNumber,
      slotIndex
    }
  }
  
  // Fechar modal
  const closeAddPlantModal = () => {
    addPlantModal.value.isOpen = false
  }
  
  // Selecionar planta
  const selectPlant = (plant) => {
    selectedPlant.value = plant
  }
  
  // ========== API CALLS (Supabase ou localStorage) ==========
  
  // Buscar todas as plantas
  const fetchPlants = async () => {
    isLoading.value = true
    try {
      // Se demo mode, usar localStorage
      if (isDemoMode()) {
        plants.value = loadFromStorage('myGarden_plants', getMockPlants())
        return
      }
      
      // Tentar Supabase
      const { data, error } = await supabaseLib.fetchPlants()
      if (error) throw error
      plants.value = data || []
    } catch (error) {
      console.error('Erro ao buscar plantas:', error)
      // Fallback para localStorage
      plants.value = loadFromStorage('myGarden_plants', getMockPlants())
    } finally {
      isLoading.value = false
    }
  }
  
  // Adicionar planta
  const addPlant = async (plantData) => {
    try {
      // Se demo mode, usar localStorage
      if (isDemoMode()) {
        const mockPlant = {
          id: Date.now().toString(),
          ...plantData,
          created_at: new Date().toISOString()
        }
        plants.value.push(mockPlant)
        return mockPlant
      }
      
      // Usar Supabase
      const { data, error } = await supabaseLib.addPlant(plantData)
      if (error) throw error
      plants.value.push(data)
      return data
    } catch (error) {
      console.error('Erro ao adicionar planta:', error)
      // Fallback local
      const mockPlant = {
        id: Date.now().toString(),
        ...plantData,
        created_at: new Date().toISOString()
      }
      plants.value.push(mockPlant)
      return mockPlant
    }
  }
  
  // Remover planta
  const removePlant = async (plantId) => {
    try {
      if (!isDemoMode()) {
        const { error } = await supabaseLib.deletePlant(plantId)
        if (error) throw error
      }
      plants.value = plants.value.filter(p => p.id !== plantId)
      showToast('Planta removida com sucesso', 'success')
    } catch (error) {
      console.error('Erro ao remover planta:', error)
      plants.value = plants.value.filter(p => p.id !== plantId)
      showToast('Planta removida', 'warning')
    }
  }
  
  // Atualizar planta
  const updatePlant = async (plantId, updates) => {
    try {
      if (!isDemoMode()) {
        const { data, error } = await supabaseLib.updatePlant(plantId, updates)
        if (error) throw error
      }
      const index = plants.value.findIndex(p => p.id === plantId)
      if (index !== -1) {
        plants.value[index] = { ...plants.value[index], ...response.data.plant }
      }
      showToast('Planta atualizada', 'success')
    } catch (error) {
      console.error('Erro ao atualizar planta:', error)
      // Fallback local
      const index = plants.value.findIndex(p => p.id === plantId)
      if (index !== -1) {
        plants.value[index] = { ...plants.value[index], ...updates }
      }
    }
  }
  
  // Buscar dados da IA
  const lookupPlantAI = async (plantName) => {
    try {
      const response = await axios.post(`${API_BASE}/ai-lookup`, { name: plantName })
      return response.data
    } catch (error) {
      console.error('Erro ao consultar IA:', error)
      // Dados mock baseados no nome
      return getMockAIData(plantName)
    }
  }
  
  // Buscar dados dos sensores (eWeLink)
  const fetchSensorData = async () => {
    try {
      const response = await axios.get(`${API_BASE}/sensors`)
      sensor.value = response.data.sensor || sensor.value
    } catch (error) {
      console.error('Erro ao buscar sensor:', error)
      // Dados mock - sensor único para toda a estufa
      sensor.value = { humidity: 58, temperature: 24 }
    }
    
    // Verificar se precisa notificar após atualizar sensor
    if (notifyTopic.value) {
      await checkAndNotify()
    }
  }
  
  // Calcular rega necessária
  const calculateWatering = async (floorNumber) => {
    try {
      const response = await axios.post(`${API_BASE}/calculate-watering`, {
        floor: floorNumber
      })
      return response.data.recommendations
    } catch (error) {
      console.error('Erro ao calcular rega:', error)
      // Cálculo local mock - usa sensor global
      const floorPlants = getPlantsByFloor(floorNumber)
      const currentSensor = sensor.value
      
      const SPRAY_ML = 0.55
      return floorPlants.map(plant => {
        const diff = plant.targets_humidade - currentSensor.humidity
        if (diff <= 0) {
          return {
            plant_id: plant.id,
            plant_name: plant.nome,
            sprays_needed: 0,
            ml_needed: 0,
            status: 'ok',
            message: 'Humidade adequada'
          }
        }
        // Fórmula: (Target - Atual) * 2ml / 0.55ml por spray
        const mlNeeded = Math.round(diff * 2)
        const sprays = Math.round(mlNeeded / SPRAY_ML)
        return {
          plant_id: plant.id,
          plant_name: plant.nome,
          sprays_needed: sprays,
          ml_needed: mlNeeded,
          status: diff <= 5 ? 'light_water' : 'needs_water',
          message: `${sprays} spray${sprays !== 1 ? 's' : ''}`
        }
      })
    }
  }
  
  // Enviar notificação para o telemóvel
  const sendNotification = async (title, message, priority = 'default') => {
    const topic = notifyTopic.value
    if (!topic) {
      console.log('Notificações não configuradas')
      return false
    }
    
    try {
      await axios.post(`${API_BASE}/notify`, {
        topic,
        title,
        message,
        priority
      })
      return true
    } catch (error) {
      console.error('Erro ao enviar notificação:', error)
      return false
    }
  }
  
  // Configurar tópico de notificações
  const setNotifyTopic = (topic) => {
    notifyTopic.value = topic
    saveToStorage('myGarden_ntfy', topic)
    showToast('Notificações configuradas!', 'success')
  }
  
  // Controlo de spam de notificações (1 notificação por hora máximo)
  const lastNotifyTime = ref(loadFromStorage('myGarden_lastNotify', 0))
  
  // Verificar e notificar se precisa de rega
  const checkAndNotify = async () => {
    const now = Date.now()
    const oneHour = 60 * 60 * 1000
    
    // Não notificar se já notificou na última hora
    if (now - lastNotifyTime.value < oneHour) {
      return false
    }
    
    const SPRAY_ML = 0.55
    const avgTarget = plants.value.length > 0
      ? plants.value.reduce((sum, p) => sum + p.targets_humidade, 0) / plants.value.length
      : 0
    
    const diff = avgTarget - sensor.value.humidity
    
    if (diff > 5 && notifyTopic.value) {
      const sprays = Math.round((diff * 2) / SPRAY_ML)
      const success = await sendNotification(
        '🌱 myGarden - Rega necessária!',
        `A estufa precisa de ~${sprays} sprays. Humidade: ${sensor.value.humidity}% (target: ${Math.round(avgTarget)}%)`,
        'high'
      )
      
      if (success) {
        lastNotifyTime.value = now
        saveToStorage('myGarden_lastNotify', now)
      }
      return success
    }
    return false
  }
  
  // ========== MOCK DATA (para desenvolvimento) ==========
  
  const getMockPlants = () => [
    {
      id: '1',
      nome: 'Manjericão',
      andar: 1,
      slot_index: 2,
      data_inicio: '2026-01-15',
      ajuste_dias: 0,
      ciclo_total: 60,
      targets_humidade: 65
    },
    {
      id: '2',
      nome: 'Tomate Cherry',
      andar: 1,
      slot_index: 5,
      data_inicio: '2026-01-01',
      ajuste_dias: 5,
      ciclo_total: 90,
      targets_humidade: 70
    },
    {
      id: '3',
      nome: 'Alface',
      andar: 2,
      slot_index: 0,
      data_inicio: '2026-01-20',
      ajuste_dias: 0,
      ciclo_total: 45,
      targets_humidade: 60
    },
    {
      id: '4',
      nome: 'Rúcula',
      andar: 2,
      slot_index: 3,
      data_inicio: '2026-01-25',
      ajuste_dias: 0,
      ciclo_total: 35,
      targets_humidade: 55
    },
    {
      id: '5',
      nome: 'Hortelã',
      andar: 3,
      slot_index: 1,
      data_inicio: '2025-12-15',
      ajuste_dias: 10,
      ciclo_total: 80,
      targets_humidade: 70
    }
  ]
  
  const getMockAIData = (plantName) => {
    const mockData = {
      'manjericão': { ciclo_total: 60, targets_humidade: 65, descricao: 'O manjericão prefere sol direto e solo húmido. Evitar regar as folhas.' },
      'tomate': { ciclo_total: 90, targets_humidade: 70, descricao: 'Tomates precisam de muito sol e rega regular. Suporte necessário quando crescer.' },
      'tomate cherry': { ciclo_total: 80, targets_humidade: 68, descricao: 'Variedade compacta e produtiva. Ideal para vasos e estufas.' },
      'alface': { ciclo_total: 45, targets_humidade: 60, descricao: 'Alface cresce rapidamente em climas amenos. Colher folhas externas primeiro.' },
      'rúcula': { ciclo_total: 35, targets_humidade: 55, descricao: 'Planta de crescimento rápido, tolera alguma sombra. Sabor mais picante com calor.' },
      'hortelã': { ciclo_total: 80, targets_humidade: 70, descricao: 'Muito invasiva, manter em vaso separado. Gosta de humidade constante.' },
      // Pimentos picantes
      'habanero': { ciclo_total: 120, targets_humidade: 60, descricao: 'Pimento muito picante. Necessita calor intenso e sol pleno. Regar moderadamente.' },
      'jalapeño': { ciclo_total: 90, targets_humidade: 65, descricao: 'Pimento picante médio. Sol pleno. Muito produtivo.' },
      'jalapeno': { ciclo_total: 90, targets_humidade: 65, descricao: 'Pimento picante médio. Sol pleno. Muito produtivo.' },
      'carolina reaper': { ciclo_total: 130, targets_humidade: 60, descricao: 'O mais picante do mundo! Necessita muito calor e paciência.' },
      'cayenne': { ciclo_total: 85, targets_humidade: 60, descricao: 'Pimento picante versátil. Sol pleno, solo bem drenado.' },
      'piri-piri': { ciclo_total: 95, targets_humidade: 60, descricao: 'Pimento africano picante. Resistente ao calor, sol pleno.' },
      'piri piri': { ciclo_total: 95, targets_humidade: 60, descricao: 'Pimento africano picante. Resistente ao calor, sol pleno.' },
      'malagueta': { ciclo_total: 90, targets_humidade: 60, descricao: 'Pimento brasileiro picante. Sol pleno, regar com moderação.' },
      'ghost pepper': { ciclo_total: 125, targets_humidade: 60, descricao: 'Bhut Jolokia, extremamente picante. Requer calor intenso.' },
      'scotch bonnet': { ciclo_total: 110, targets_humidade: 65, descricao: 'Pimento caribenho. Sabor frutado distintivo.' },
      'tabasco': { ciclo_total: 100, targets_humidade: 65, descricao: 'Pimento para molhos. Muito produtivo com calor adequado.' },
      'serrano': { ciclo_total: 85, targets_humidade: 65, descricao: 'Pimento mexicano. Mais picante que jalapeño.' },
      // Outros
      'pimento': { ciclo_total: 100, targets_humidade: 65, descricao: 'Necessita calor e sol. Regar regularmente.' },
      'pepino': { ciclo_total: 55, targets_humidade: 75, descricao: 'Necessita muito água e calor. Trepar em suporte.' },
      'morango': { ciclo_total: 120, targets_humidade: 65, descricao: 'Sol pleno. Frutos após 3-4 meses.' },
      'cebolinho': { ciclo_total: 60, targets_humidade: 55, descricao: 'Perene resistente. Cortar regularmente.' },
      'salsa': { ciclo_total: 75, targets_humidade: 60, descricao: 'Germinação lenta. Manter solo húmido.' },
      'coentros': { ciclo_total: 50, targets_humidade: 55, descricao: 'Ciclo rápido. Evitar transplante.' },
      'espinafre': { ciclo_total: 40, targets_humidade: 60, descricao: 'Prefere temperaturas amenas, bolt com calor.' },
      'couve': { ciclo_total: 65, targets_humidade: 60, descricao: 'Tolera frio. Solo rico.' },
      'agrião': { ciclo_total: 30, targets_humidade: 80, descricao: 'Adora água. Crescimento muito rápido.' },
      'orégãos': { ciclo_total: 85, targets_humidade: 45, descricao: 'Mediterrâneo. Prefere solo seco.' },
      'cenoura': { ciclo_total: 75, targets_humidade: 65, descricao: 'Solo solto e profundo.' },
      'rabanete': { ciclo_total: 30, targets_humidade: 70, descricao: 'O mais rápido! Pronto em 4 semanas.' }
    }
    
    const key = plantName.toLowerCase()
    
    // Procura exacta
    if (mockData[key]) {
      return mockData[key]
    }
    
    // Procura parcial
    for (const [name, data] of Object.entries(mockData)) {
      if (key.includes(name) || name.includes(key)) {
        return data
      }
    }
    
    // Dados genéricos
    return {
      ciclo_total: 60,
      targets_humidade: 65,
      descricao: `Dados genéricos para ${plantName}. Ajuste conforme necessário.`
    }
  }
  
  // ========== INICIALIZAÇÃO ==========
  
  // Carregar dados iniciais
  const initialize = async () => {
    await Promise.all([
      fetchPlants(),
      fetchSensorData()
    ])
  }
  
  // Inicializar automaticamente
  initialize()

  return {
    // State
    plants,
    sensor,
    notifyTopic,
    addPlantModal,
    selectedPlant,
    toasts,
    isLoading,
    
    // Getters
    getPlantsByFloor,
    getSensorByFloor,
    getGlobalSensor,
    totalPlants,
    plantsNeedingWater,
    
    // Actions
    showToast,
    openAddPlantModal,
    closeAddPlantModal,
    selectPlant,
    fetchPlants,
    addPlant,
    removePlant,
    updatePlant,
    lookupPlantAI,
    fetchSensorData,
    calculateWatering,
    sendNotification,
    setNotifyTopic,
    checkAndNotify,
    initialize
  }
})
