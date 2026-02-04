import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Inicializar autenticação
import { useAuthStore } from './stores/auth'
const authStore = useAuthStore(pinia)
authStore.initialize().then(() => {
  app.mount('#app')
})
