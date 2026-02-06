-- ===========================================
-- myGarden - Supabase Database Schema
-- ===========================================
-- Executa este SQL no Supabase SQL Editor
-- Dashboard > SQL Editor > New Query

-- Habilitar RLS (Row Level Security)
-- Importante: Isto garante que cada utilizador só vê os seus dados

-- ===========================================
-- Tabela: plants
-- ===========================================
CREATE TABLE IF NOT EXISTS plants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  andar INTEGER NOT NULL CHECK (andar >= 1 AND andar <= 3),
  slot_index INTEGER NOT NULL CHECK (slot_index >= 0 AND slot_index < 12),
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  ajuste_dias INTEGER DEFAULT 0,
  ciclo_total INTEGER NOT NULL DEFAULT 60,
  targets_humidade INTEGER NOT NULL DEFAULT 65 CHECK (targets_humidade >= 0 AND targets_humidade <= 100),
  temperatura_ideal VARCHAR(50),
  luz VARCHAR(100),
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Garantir que não há duas plantas no mesmo slot
  UNIQUE(user_id, andar, slot_index)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_plants_user_id ON plants(user_id);
CREATE INDEX IF NOT EXISTS idx_plants_andar ON plants(andar);

-- RLS Policies para plants
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;

-- Utilizadores só podem ver as suas próprias plantas
CREATE POLICY "Users can view their own plants" ON plants
  FOR SELECT USING (auth.uid() = user_id);

-- Utilizadores só podem inserir plantas para si mesmos
CREATE POLICY "Users can insert their own plants" ON plants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Utilizadores só podem atualizar as suas próprias plantas
CREATE POLICY "Users can update their own plants" ON plants
  FOR UPDATE USING (auth.uid() = user_id);

-- Utilizadores só podem apagar as suas próprias plantas
CREATE POLICY "Users can delete their own plants" ON plants
  FOR DELETE USING (auth.uid() = user_id);

-- ===========================================
-- Tabela: sensor_readings
-- ===========================================
CREATE TABLE IF NOT EXISTS sensor_readings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  humidity DECIMAL(5,2) NOT NULL CHECK (humidity >= 0 AND humidity <= 100),
  temperature DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sensor_readings_user_id ON sensor_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_created_at ON sensor_readings(created_at DESC);

-- RLS Policies para sensor_readings
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sensor readings" ON sensor_readings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sensor readings" ON sensor_readings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- Tabela: user_settings
-- ===========================================
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  ntfy_topic VARCHAR(255),
  ewelink_device_id VARCHAR(255),
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies para user_settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- ===========================================
-- Função: update_updated_at
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER plants_updated_at
  BEFORE UPDATE ON plants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- Tabela: notifications_log
-- ===========================================
CREATE TABLE IF NOT EXISTS notifications_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'watering', 'temperature', 'error', etc
  message TEXT NOT NULL,
  sent BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_notifications_log_user_id ON notifications_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_log_created_at ON notifications_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_log_type ON notifications_log(type);

-- RLS Policies para notifications_log (apenas leitura)
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification logs" ON notifications_log
  FOR SELECT USING (auth.uid() = user_id);

-- ===========================================
-- IMPORTANTE: Configuração de Auth
-- ===========================================
-- No Supabase Dashboard:
-- 1. Authentication > Settings > Email Auth: Enable
-- 2. Authentication > Settings > Site URL: URL do teu site
-- 3. Authentication > Settings > Redirect URLs: Adiciona o URL do teu site

-- Para desativar confirmação de email (desenvolvimento):
-- UPDATE auth.config SET mailer_autoconfirm = true;
-- Ou no Dashboard: Authentication > Settings > "Enable email confirmations" = OFF

COMMENT ON TABLE plants IS 'Plantas do utilizador em cada andar da estufa';
COMMENT ON TABLE sensor_readings IS 'Histórico de leituras do sensor de humidade/temperatura';
COMMENT ON TABLE user_settings IS 'Configurações pessoais do utilizador (notificações, dispositivos)';
