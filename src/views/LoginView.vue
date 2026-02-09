<template>
  <div class="login-page">
    <div class="login-container">
      <!-- Logo -->
      <div class="login-logo">
        <div class="logo-icon">🌱</div>
        <h1 class="logo-text">myGarden</h1>
        <p class="logo-subtitle">Gestão inteligente de estufa</p>
      </div>

      <!-- Tabs -->
      <div class="auth-tabs">
        <button 
          :class="['tab', { 'tab--active': activeTab === 'login' }]"
          @click="activeTab = 'login'"
        >
          Entrar
        </button>
        <button 
          :class="['tab', { 'tab--active': activeTab === 'register' }]"
          @click="activeTab = 'register'"
        >
          Registar
        </button>
      </div>

      <!-- Formulário -->
      <form @submit.prevent="handleSubmit" class="auth-form">
        <!-- Email -->
        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="o.teu@email.com"
            required
            autocomplete="email"
          />
        </div>

        <!-- Password -->
        <div class="form-group">
          <label for="password">Password</label>
          <div class="password-input">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••"
              required
              :minlength="activeTab === 'register' ? 6 : undefined"
              autocomplete="current-password"
            />
            <button 
              type="button" 
              class="toggle-password"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>

        <!-- Confirmar Password (só registo) -->
        <div v-if="activeTab === 'register'" class="form-group">
          <label for="confirmPassword">Confirmar Password</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            :type="showPassword ? 'text' : 'password'"
            placeholder="••••••••"
            required
            minlength="6"
            autocomplete="new-password"
          />
        </div>

        <!-- Erro -->
        <div v-if="authStore.error" class="error-message">
          ⚠️ {{ authStore.error }}
        </div>

        <!-- Sucesso (confirmação email) -->
        <div v-if="successMessage" class="success-message">
          ✅ {{ successMessage }}
        </div>

        <!-- Botão Submit -->
        <button 
          type="submit" 
          class="submit-btn"
          :disabled="authStore.loading"
        >
          <span v-if="authStore.loading">⏳ A processar...</span>
          <span v-else>{{ activeTab === 'login' ? '🚀 Entrar' : '📝 Criar Conta' }}</span>
        </button>
      </form>

      <!-- Demo -->
      <div class="demo-section">
        <p class="demo-text">Sem conta? Experimenta primeiro!</p>
        <button class="demo-btn" @click="startDemo">
          🎭 Correr Demo
        </button>
      </div>
    </div>

    <!-- Background decorations -->
    <div class="bg-decoration">
      <div class="leaf leaf-1">🌿</div>
      <div class="leaf leaf-2">🌱</div>
      <div class="leaf leaf-3">🪴</div>
      <div class="leaf leaf-4">🌸</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useGreenhouseStore } from '@/stores/greenhouse'

const router = useRouter()
const authStore = useAuthStore()
const greenhouseStore = useGreenhouseStore()

const activeTab = ref('login')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const successMessage = ref('')

const startDemo = () => {
  authStore.loginAsDemo()
  greenhouseStore.initializeDemo()
  router.push('/')
}

const handleSubmit = async () => {
  successMessage.value = ''
  authStore.clearError()

  if (activeTab.value === 'register') {
    // Validar passwords
    if (password.value !== confirmPassword.value) {
      authStore.error = 'As passwords não coincidem'
      return
    }
    
    const result = await authStore.register(email.value, password.value)
    
    if (result.success) {
      if (result.needsConfirmation) {
        successMessage.value = result.message
        activeTab.value = 'login'
      } else {
        router.push('/')
      }
    }
  } else {
    const result = await authStore.login(email.value, password.value)
    
    if (result.success) {
      router.push('/')
    }
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.login-container {
  width: 100%;
  max-width: 400px;
  background: rgba(26, 47, 35, 0.95);
  border: 1px solid rgba(34, 139, 34, 0.3);
  border-radius: 24px;
  padding: 40px 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  position: relative;
  z-index: 10;
}

/* Logo */
.login-logo {
  text-align: center;
  margin-bottom: 32px;
}

.logo-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.logo-text {
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.logo-subtitle {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  margin: 4px 0 0;
}

/* Tabs */
.auth-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  background: rgba(0, 0, 0, 0.2);
  padding: 4px;
  border-radius: 12px;
}

.tab {
  flex: 1;
  padding: 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.tab--active {
  background: rgba(34, 139, 34, 0.3);
  color: #32CD32;
}

.tab:hover:not(.tab--active) {
  background: rgba(255, 255, 255, 0.05);
}

/* Form */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

.form-group input {
  width: 100%;
  padding: 14px 16px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #fff;
  font-size: 16px;
  transition: all 0.2s;
}

.form-group input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.form-group input:focus {
  outline: none;
  border-color: rgba(34, 139, 34, 0.5);
  box-shadow: 0 0 0 3px rgba(34, 139, 34, 0.1);
}

/* Password input */
.password-input {
  position: relative;
}

.password-input input {
  padding-right: 50px;
}

.toggle-password {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  opacity: 0.7;
}

.toggle-password:hover {
  opacity: 1;
}

/* Messages */
.error-message {
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 10px;
  color: #FCA5A5;
  font-size: 14px;
}

.success-message {
  padding: 12px 16px;
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 10px;
  color: #86EFAC;
  font-size: 14px;
}

/* Submit button */
.submit-btn {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #228B22, #32CD32);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(34, 139, 34, 0.4);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Demo section */
.demo-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
}

.demo-text {
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  margin-bottom: 12px;
}

.demo-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 12px 24px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.demo-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

/* Background decorations */
.bg-decoration {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.leaf {
  position: absolute;
  font-size: 60px;
  opacity: 0.1;
  animation: float 10s ease-in-out infinite;
}

.leaf-1 { top: 10%; left: 10%; animation-delay: 0s; }
.leaf-2 { top: 60%; right: 15%; animation-delay: 2s; }
.leaf-3 { bottom: 20%; left: 20%; animation-delay: 4s; }
.leaf-4 { top: 30%; right: 10%; animation-delay: 6s; }

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(5deg); }
}

/* Responsive */
@media (max-width: 480px) {
  .login-container {
    padding: 32px 24px;
  }
  
  .logo-icon {
    font-size: 40px;
  }
  
  .logo-text {
    font-size: 28px;
  }
  
  .leaf {
    font-size: 40px;
  }
}
</style>
