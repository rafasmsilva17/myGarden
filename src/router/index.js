import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import GreenhouseView from '@/views/GreenhouseView.vue'
import FloorView from '@/views/FloorView.vue'
import LoginView from '@/views/LoginView.vue'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { public: true }
  },
  {
    path: '/',
    name: 'greenhouse',
    component: GreenhouseView,
    meta: { requiresAuth: true }
  },
  {
    path: '/floor/:floorNumber',
    name: 'floor',
    component: FloorView,
    props: true,
    meta: { requiresAuth: true }
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Guard de navegação para verificar autenticação
router.beforeEach((to, from, next) => {
  // Se rota é pública, deixar passar
  if (to.meta.public) {
    return next()
  }
  
  const authStore = useAuthStore()
  
  // Verificar se requer autenticação
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next('/login')
  }
  
  next()
})

export default router
