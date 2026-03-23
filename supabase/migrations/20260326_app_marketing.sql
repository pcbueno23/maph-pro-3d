-- Conteúdo público: fornecedores e promoções (editado pelo painel admin via service_role).
CREATE TABLE IF NOT EXISTS app_marketing (
  id text PRIMARY KEY DEFAULT 'default',
  fornecedores jsonb NOT NULL DEFAULT '[]'::jsonb,
  promocoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_marketing ENABLE ROW LEVEL SECURITY;

-- Leitura pública para o app (anon + authenticated) — sem expor service_role no cliente.
DROP POLICY IF EXISTS "app_marketing_select_all" ON app_marketing;
CREATE POLICY "app_marketing_select_all" ON app_marketing
  FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO app_marketing (id) VALUES ('default')
  ON CONFLICT (id) DO NOTHING;
