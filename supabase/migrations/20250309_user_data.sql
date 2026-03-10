-- Tabelas para persistir dados por usuário (configurações, estoque, insumos, vendas).
-- Execute este SQL no Supabase (SQL Editor) se ainda não criou as tabelas.

-- Configurações do usuário (uma linha por usuário)
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Estoque (uma linha por usuário, itens em JSONB)
CREATE TABLE IF NOT EXISTS user_inventory (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insumos (uma linha por usuário)
CREATE TABLE IF NOT EXISTS user_supplies (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vendas (uma linha por usuário)
CREATE TABLE IF NOT EXISTS user_sales (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: cada usuário só acessa os próprios dados
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings_own" ON user_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_inventory_own" ON user_inventory
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_supplies_own" ON user_supplies
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_sales_own" ON user_sales
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
