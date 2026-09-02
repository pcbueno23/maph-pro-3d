-- Integração Mercado Livre via OAuth oficial (Developers). Guarda só os tokens
-- retornados pela troca do "code" de autorização, nunca a senha do usuário.
CREATE TABLE IF NOT EXISTS ml_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  ml_user_id TEXT NOT NULL,
  nickname TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  last_synced_at TIMESTAMPTZ,
  last_order_date TIMESTAMPTZ,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE ml_accounts ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ml_accounts' AND policyname = 'ml_accounts_own'
  ) THEN
    EXECUTE 'CREATE POLICY "ml_accounts_own" ON ml_accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;
