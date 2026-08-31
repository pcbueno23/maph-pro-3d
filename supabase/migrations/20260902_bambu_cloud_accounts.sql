-- Integração Bambu Lab (Fase 3 do dossiê 3D Hunt) — modo Cloud primeiro (o modo LAN
-- exige um agente local à parte, ainda não construído). Guarda só o token de acesso
-- retornado pelo login da Bambu, nunca a senha.
CREATE TABLE IF NOT EXISTS bambu_cloud_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  region TEXT NOT NULL DEFAULT 'global',
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE bambu_cloud_accounts ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bambu_cloud_accounts' AND policyname = 'bambu_cloud_accounts_own'
  ) THEN
    EXECUTE 'CREATE POLICY "bambu_cloud_accounts_own" ON bambu_cloud_accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;

-- Snapshot mais recente de cada impressora Bambu vinculada à conta — preenchido por
-- polling do backend (ver app/api/bambu/status/route.ts). Sem histórico, só o último estado.
CREATE TABLE IF NOT EXISTS bambu_device_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dev_id TEXT NOT NULL,
  name TEXT,
  online BOOLEAN NOT NULL DEFAULT false,
  print_status TEXT,
  progress_percent NUMERIC,
  remaining_minutes NUMERIC,
  nozzle_temper NUMERIC,
  bed_temper NUMERIC,
  raw JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE bambu_device_status ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bambu_device_status' AND policyname = 'bambu_device_status_own'
  ) THEN
    EXECUTE 'CREATE POLICY "bambu_device_status_own" ON bambu_device_status FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS bambu_device_status_unique ON bambu_device_status(user_id, dev_id);
