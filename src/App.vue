<template>
  <div class="min-h-screen">
    <header class="bg-greenhouse-metal/30 backdrop-blur-sm border-b border-greenhouse-metal/50 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
        <router-link to="/" class="flex items-center gap-2 sm:gap-3">
          <div class="w-8 h-8 sm:w-10 sm:h-10 bg-leaf-green rounded-full flex items-center justify-center">
            <span class="text-xl sm:text-2xl">🌱</span>
          </div>
          <h1 class="text-lg sm:text-2xl font-bold text-white">myGarden</h1>
        </router-link>
        <nav class="flex items-center gap-2 sm:gap-4">
          <button
            @click="showSettings = true"
            class="text-white/70 hover:text-white transition-colors p-2"
            title="Definições"
          >
            <span class="text-xl">⚙️</span>
          </button>
          <button
            @click="refreshSensors"
            class="bg-leaf-green/20 hover:bg-leaf-green/30 text-leaf-light px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <span>🔄</span>
            <span class="hidden sm:inline">Atualizar</span>
          </button>
        </nav>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <router-view />
    </main>

    <!-- Modal Global -->
    <AddPlantModal />
    
    <!-- Modal de Definições -->
    <div v-if="showSettings" class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" @click.self="showSettings = false">
      <div class="bg-greenhouse-bg border border-greenhouse-metal/50 rounded-2xl p-6 w-full max-w-md">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-white">⚙️ Definições</h2>
          <button @click="showSettings = false" class="text-white/50 hover:text-white text-2xl">&times;</button>
        </div>
        
        <!-- Notificações -->
        <div class="mb-6">
          <h3 class="text-white font-semibold mb-2">📱 Notificações no Telemóvel</h3>
          <p class="text-white/50 text-sm mb-3">
            Usa o <a href="https://ntfy.sh" target="_blank" class="text-leaf-light underline">ntfy.sh</a> para receber alertas de rega.
          </p>
          <div class="flex gap-2">
            <input
              v-model="ntfyTopic"
              type="text"
              placeholder="O teu tópico ntfy (ex: mygarden123)"
              class="flex-1 bg-black/30 border border-greenhouse-metal/50 rounded-lg px-4 py-2 text-white placeholder-white/30"
            />
            <button
              @click="saveNtfy"
              class="bg-leaf-green hover:bg-leaf-green/80 text-white px-4 py-2 rounded-lg font-semibold"
            >
              Guardar
            </button>
          </div>
          <p class="text-white/40 text-xs mt-2">
            1. Instala a app ntfy no telemóvel<br>
            2. Subscreve o mesmo tópico<br>
            3. Recebe alertas quando precisar regar!
          </p>
        </div>
        
        <!-- Testar Notificação -->
        <button
          v-if="store.notifyTopic"
          @click="testNotification"
          class="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-semibold mb-4"
        >
          🔔 Testar Notificação
        </button>
        
        <!-- Info -->
        <div class="text-center text-white/30 text-xs">
          myGarden v1.0 • Dados guardados localmente
        </div>
      </div>
    </div>
    
    <!-- Notificações Toast -->
    <div class="fixed bottom-4 right-4 z-50 space-y-2">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="[
            'px-4 py-3 rounded-lg shadow-lg max-w-sm',
            toast.type === 'success' ? 'bg-green-600' : '',
            toast.type === 'error' ? 'bg-red-600' : '',
            toast.type === 'warning' ? 'bg-yellow-600' : '',
            toast.type === 'info' ? 'bg-blue-600' : ''
          ]"
        >
          <p class="text-white text-sm">{{ toast.message }}</p>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useGreenhouseStore } from '@/stores/greenhouse'
import AddPlantModal from '@/components/AddPlantModal.vue'

const store = useGreenhouseStore()
const toasts = computed(() => store.toasts)
const showSettings = ref(false)
const ntfyTopic = ref(store.notifyTopic || '')

const refreshSensors = async () => {
  await store.fetchSensorData()
  store.showToast('Sensor atualizado!', 'success')
}

const saveNtfy = () => {
  store.setNotifyTopic(ntfyTopic.value)
}

const testNotification = async () => {
  const success = await store.sendNotification(
    '🌱 myGarden - Teste',
    'Se vês isto, as notificações estão a funcionar!',
    'default'
  )
  if (success) {
    store.showToast('Notificação enviada!', 'success')
  } else {
    store.showToast('Erro ao enviar notificação', 'error')
  }
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
