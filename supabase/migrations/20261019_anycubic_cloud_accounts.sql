-- Integração Anycubic Cloud (Kobra X) — mesmo padrão da Bambu (bambu_cloud_accounts /
-- bambu_device_status), mas com um dado a mais: o access_token NÃO vem de login
-- e-mail+senha normal, vem extraído do Anycubic Slicer Next pelo próprio usuário (processo
-- manual, fora do SaaS) e colado aqui — guardamos ele além do token de sessão porque ele é
-- reaproveitado pra gerar a senha da conexão MQTT (criptografia RSA, ver lib/anycubicCloud.ts).
CREATE TABLE IF NOT EXISTS anycubic_cloud_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  slicer_access_token TEXT NOT NULL,
  session_token TEXT NOT NULL,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE anycubic_cloud_accounts ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'anycubic_cloud_accounts' AND policyname = 'anycubic_cloud_accounts_own'
  ) THEN
    EXECUTE 'CREATE POLICY "anycubic_cloud_accounts_own" ON anycubic_cloud_accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;

-- Snapshot mais recente de cada impressora Anycubic vinculada à conta.
CREATE TABLE IF NOT EXISTS anycubic_device_status (
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
ALTER TABLE anycubic_device_status ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'anycubic_device_status' AND policyname = 'anycubic_device_status_own'
  ) THEN
    EXECUTE 'CREATE POLICY "anycubic_device_status_own" ON anycubic_device_status FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS anycubic_device_status_unique ON anycubic_device_status(user_id, dev_id);
