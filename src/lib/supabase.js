/**
 * myGarden - Supabase Client
 * Configuração do cliente Supabase para autenticação e base de dados
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase não configurado. Adiciona VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY ao .env')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
)

// ========== AUTH HELPERS ==========

/**
 * Registar novo utilizador
 */
export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  })
  return { data, error }
}

/**
 * Login com email/password
 */
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  return { data, error }
}

/**
 * Logout
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

/**
 * Obter utilizador atual
 */
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Obter sessão atual
 */
export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// ========== PLANTS CRUD ==========

/**
 * Buscar todas as plantas do utilizador
 */
export const fetchPlants = async () => {
  const { data, error } = await supabase
    .from('plants')
    .select('*')
    .order('created_at', { ascending: false })
  
  return { data, error }
}

/**
 * Adicionar nova planta
 */
export const addPlant = async (plant) => {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('plants')
    .insert([{ ...plant, user_id: user?.id }])
    .select()
    .single()
  
  return { data, error }
}

/**
 * Atualizar planta
 */
export const updatePlant = async (id, updates) => {
  const { data, error } = await supabase
    .from('plants')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  return { data, error }
}

/**
 * Remover planta
 */
export const deletePlant = async (id) => {
  const { error } = await supabase
    .from('plants')
    .delete()
    .eq('id', id)
  
  return { error }
}

// ========== SENSOR DATA ==========

/**
 * Buscar último registo do sensor
 */
export const fetchLatestSensor = async () => {
  const { data, error } = await supabase
    .from('sensor_readings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  return { data, error }
}

/**
 * Guardar leitura do sensor
 */
export const saveSensorReading = async (reading) => {
  const { data, error } = await supabase
    .from('sensor_readings')
    .insert([reading])
    .select()
    .single()
  
  return { data, error }
}

// ========== USER SETTINGS ==========

/**
 * Buscar configurações do utilizador
 */
export const fetchUserSettings = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Não autenticado' }
  
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()
  
  return { data, error }
}

/**
 * Guardar configurações do utilizador
 */
export const saveUserSettings = async (settings) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Não autenticado' }
  
  const { data, error } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, ...settings })
    .select()
    .single()
  
  return { data, error }
}

export default supabase
