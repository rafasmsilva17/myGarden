import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import * as supabaseLib from '@/lib/supabase'

const API_BASE = '/.netlify/functions'

export const useGreenhouseStore = defineStore('greenhouse', () => {
  // ========== STATE ==========
  const plants = ref([])
  const sensor = ref({ humidity: 0, temperature: 0 })
  const notifyTopic = ref('')
  const addPlantModal = ref({ isOpen: false, floorNumber: 1, slotIndex: 0 })
  const selectedPlant = ref(null)
  const toasts = ref([])
  const isLoading = ref(false)

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
      if (!sensor.value) return false
      return sensor.value.humidity < plant.targets_humidade - 5
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
  
  // ========== API CALLS (Supabase) ==========
  
  // Buscar todas as plantas
  const fetchPlants = async () => {
    isLoading.value = true
    try {
      const { data, error } = await supabaseLib.fetchPlants()
      if (error) throw error
      plants.value = data || []
    } catch (error) {
      console.error('Erro ao buscar plantas:', error)
      plants.value = [] // Limpar em caso de erro
      showToast('Não foi possível carregar as plantas.', 'error')
    } finally {
      isLoading.value = false
    }
  }
  
  // Adicionar planta
  const addPlant = async (plantData) => {
    try {
      const { data, error } = await supabaseLib.addPlant(plantData)
      if (error) throw error
      if (data) {
        plants.value.push(data)
      }
      return data
    } catch (error) {
      console.error('Erro ao adicionar planta:', error)
      showToast('Erro ao adicionar planta.', 'error')
      return null
    }
  }
  
  // Remover planta
  const removePlant = async (plantId) => {
    try {
      const { error } = await supabaseLib.deletePlant(plantId)
      if (error) throw error
      
      plants.value = plants.value.filter(p => p.id !== plantId)
      showToast('Planta removida com sucesso', 'success')
    } catch (error) {
      console.error('Erro ao remover planta:', error)
      showToast('Erro ao remover planta.', 'error')
    }
  }
  
  // Atualizar planta
  const updatePlant = async (plantId, updates) => {
    try {
      const { data, error } = await supabaseLib.updatePlant(plantId, updates)
      if (error) throw error
      
      if (data) {
        const index = plants.value.findIndex(p => p.id === plantId)
        if (index !== -1) {
          plants.value[index] = { ...plants.value[index], ...data }
        }
      }
      showToast('Planta atualizada', 'success')
    } catch (error) {
      console.error('Erro ao atualizar planta:', error)
      showToast('Erro ao atualizar planta.', 'error')
    }
  }
  
  // Buscar dados da IA
  const lookupPlantAI = async (plantName) => {
    isLoading.value = true
    try {
      const response = await axios.post(`${API_BASE}/ai-lookup`, { name: plantName })
      return response.data
    } catch (error) {
      console.error('Erro ao consultar IA:', error)
      showToast('Serviço de IA indisponível.', 'error')
      return null // Retorna nulo para indicar o erro
    } finally {
      isLoading.value = false
    }
  }
  
  // Buscar dados dos sensores (eWeLink)
  const fetchSensorData = async () => {
    try {
      const response = await axios.get(`${API_BASE}/sensors`)
      sensor.value = response.data.sensor || { humidity: 0, temperature: 0 }
    } catch (error) {
      console.error('Erro ao buscar sensor:', error)
      // Mantém o valor anterior ou zera se não houver
      sensor.value = sensor.value || { humidity: 0, temperature: 0 }
      showToast('Não foi possível ler os sensores.', 'error')
    }
    
    // Nota: Notificações automáticas agora são enviadas pelo backend
    // via função Netlify schedulada a cada 10 minutos
    // Não é necessário verificar aqui no frontend
  }
  
  // Calcular rega necessária (cálculo local)
  const calculateWatering = (floorNumber) => {
    const SPRAY_ML = 0.55
    const ML_PER_PERCENT = 2.0
    
    const floorPlants = getPlantsByFloor(floorNumber)
    const currentHumidity = sensor.value.humidity || 50
    
    return floorPlants.map(plant => {
      const targetHumidity = plant.targets_humidade || 65
      const diff = targetHumidity - currentHumidity
      
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
      
      const mlNeeded = Math.round(diff * ML_PER_PERCENT)
      const spraysNeeded = Math.round(mlNeeded / SPRAY_ML)
      
      return {
        plant_id: plant.id,
        plant_name: plant.nome,
        sprays_needed: spraysNeeded,
        ml_needed: mlNeeded,
        status: diff > 10 ? 'needs_water' : 'light_water',
        message: `${spraysNeeded} spray${spraysNeeded !== 1 ? 's' : ''}`
      }
    })
  }
  
  // Enviar notificação para o telemóvel
  const sendNotification = async (title, message, priority = 'default') => {
    const topic = notifyTopic.value
    console.log('Enviando notificação para tópico:', topic)
    
    if (!topic) {
      console.log('Notificações não configuradas - tópico vazio')
      showToast('Configure o tópico ntfy nas definições primeiro', 'warning')
      return false
    }
    
    try {
      const response = await axios.post(`${API_BASE}/notify`, {
        topic,
        title,
        message,
        priority
      })
      console.log('Resposta notify:', response.data)
      return true
    } catch (error) {
      console.error('Erro ao enviar notificação:', error.response?.data || error.message)
      return false
    }
  }
  
  // Configurar tópico de notificações (guarda no Supabase)
  const setNotifyTopic = async (topic) => {
    notifyTopic.value = topic
    try {
      await supabaseLib.saveUserSettings({ ntfy_topic: topic })
      showToast('Notificações configuradas!', 'success')
    } catch (error) {
      console.error('Erro ao guardar configurações:', error)
      showToast('Configurações guardadas localmente', 'warning')
    }
  }
  
  // Carregar configurações do utilizador
  const loadUserSettings = async () => {
    try {
      const { data, error } = await supabaseLib.fetchUserSettings()
      console.log('Configurações carregadas:', data, 'Erro:', error)
      if (data && !error) {
        notifyTopic.value = data.ntfy_topic || ''
        console.log('Tópico ntfy carregado:', notifyTopic.value)
      } else if (error) {
        // Se a tabela não existe ou utilizador não tem configurações, ignorar
        console.log('Sem configurações guardadas (normal para novo utilizador)')
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    }
  }
  
  // Controlo de spam de notificações (1 notificação por hora máximo)
  const lastNotifyTime = ref(0)
  
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
      fetchSensorData(),
      loadUserSettings()
    ])
  }

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
    loadUserSettings,
    checkAndNotify,
    initialize
  }
})
