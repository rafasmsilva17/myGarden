import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Importar stores
import { useAuthStore } from './stores/auth'
import { useGreenhouseStore } from './stores/greenhouse'

const authStore = useAuthStore(pinia)
const greenhouseStore = useGreenhouseStore(pinia)

// Inicializar autenticação e depois montar a app
authStore.initialize().then(() => {
  // Se estiver autenticado, carregar dados da estufa
  if (authStore.isAuthenticated) {
    greenhouseStore.initialize()
  }
  app.mount('#app')
})
