import { createRouter, createWebHistory } from 'vue-router'
import GreenhouseView from '@/views/GreenhouseView.vue'
import FloorView from '@/views/FloorView.vue'

const routes = [
  {
    path: '/',
    name: 'greenhouse',
    component: GreenhouseView,
  },
  {
    path: '/floor/:floorNumber',
    name: 'floor',
    component: FloorView,
    props: true,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
