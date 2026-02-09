/**
 * myGarden - Auth Store
 * Gestão de autenticação com Supabase
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase, signIn, signUp, signOut, getCurrentUser, getSession } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  // ========== STATE ==========
  const user = ref(null)
  const session = ref(null)
  const loading = ref(true)
  const error = ref(null)
  const isDemo = ref(false)

  // ========== GETTERS ==========
  const isAuthenticated = computed(() => !!user.value || isDemo.value)
  const isDemoMode = computed(() => isDemo.value)
  const userEmail = computed(() => isDemo.value ? 'demo@mygarden.app' : (user.value?.email || ''))
  const userId = computed(() => isDemo.value ? 'demo-user' : (user.value?.id || null))

  // ========== ACTIONS ==========
  
  /**
   * Inicializar auth - verificar sessão existente
   */
  const initialize = async () => {
    loading.value = true
    error.value = null
    
    try {
      // Verificar sessão atual
      const currentSession = await getSession()
      session.value = currentSession
      
      if (currentSession) {
        user.value = currentSession.user
      }
      
      // Escutar mudanças de auth
      supabase.auth.onAuthStateChange((event, newSession) => {
        session.value = newSession
        user.value = newSession?.user || null
        
        if (event === 'SIGNED_OUT') {
          user.value = null
          session.value = null
        }
      })
    } catch (err) {
      console.error('Erro ao inicializar auth:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  /**
   * Login com email e password
   */
  const login = async (email, password) => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: authError } = await signIn(email, password)
      
      if (authError) {
        throw authError
      }
      
      user.value = data.user
      session.value = data.session
      return { success: true }
    } catch (err) {
      console.error('Erro no login:', err)
      error.value = translateError(err.message)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * Registar novo utilizador
   */
  const register = async (email, password) => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: authError } = await signUp(email, password)
      
      if (authError) {
        throw authError
      }
      
      // Se o Supabase requer confirmação de email
      if (data.user && !data.session) {
        return { 
          success: true, 
          needsConfirmation: true,
          message: 'Verifica o teu email para confirmar a conta!'
        }
      }
      
      user.value = data.user
      session.value = data.session
      return { success: true }
    } catch (err) {
      console.error('Erro no registo:', err)
      error.value = translateError(err.message)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * Logout
   */
  const logout = async () => {
    loading.value = true
    error.value = null
    
    try {
      if (!isDemo.value) {
        await signOut()
      }
      user.value = null
      session.value = null
      isDemo.value = false
      return { success: true }
    } catch (err) {
      console.error('Erro no logout:', err)
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * Login em modo demo (sem Supabase)
   */
  const loginAsDemo = () => {
    isDemo.value = true
    user.value = null
    session.value = null
    loading.value = false
    error.value = null
    return { success: true }
  }

  /**
   * Traduzir erros do Supabase para português
   */
  const translateError = (message) => {
    const translations = {
      'Invalid login credentials': 'Email ou password incorretos',
      'Email not confirmed': 'Email não confirmado. Verifica a tua caixa de entrada.',
      'User already registered': 'Este email já está registado',
      'Password should be at least 6 characters': 'A password deve ter pelo menos 6 caracteres',
      'Unable to validate email address: invalid format': 'Formato de email inválido',
      'Email rate limit exceeded': 'Demasiadas tentativas. Aguarda alguns minutos.',
      'Invalid email or password': 'Email ou password inválidos'
    }
    
    return translations[message] || message
  }

  /**
   * Limpar erro
   */
  const clearError = () => {
    error.value = null
  }

  return {
    // State
    user,
    session,
    loading,
    error,
    isDemo,
    // Getters
    isAuthenticated,
    isDemoMode,
    userEmail,
    userId,
    // Actions
    initialize,
    login,
    loginAsDemo,
    register,
    logout,
    clearError
  }
})
