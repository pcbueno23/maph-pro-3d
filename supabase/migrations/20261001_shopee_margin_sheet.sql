-- "Planilha" de preço e margem por produto Shopee, trazida pro SaaS (import/export .xlsx
-- no mesmo formato de uma planilha real que o usuário já usava: aba "Preços e Margem" +
-- aba "Parâmetros"). Reimport só atualiza os preços lidos da Shopee (cadastro/promoção/
-- relâmpago) — custo de produção e embalagem preenchidos ficam preservados (upsert por
-- produto+variação, nunca wipe-and-replace).
CREATE TABLE IF NOT EXISTS shopee_margin_sheet_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  produto TEXT NOT NULL,
  variacao TEXT NOT NULL DEFAULT '',
  num_variacoes INTEGER,
  preco_cadastro NUMERIC,
  preco_promocao_rede NUMERIC,
  preco_relampago NUMERIC,
  custo_producao NUMERIC,
  embalagem_outros NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS shopee_margin_sheet_rows_user_key_idx
  ON shopee_margin_sheet_rows (user_id, produto, variacao);
ALTER TABLE shopee_margin_sheet_rows ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'shopee_margin_sheet_rows' AND policyname = 'shopee_margin_sheet_rows_own'
  ) THEN
    EXECUTE 'CREATE POLICY "shopee_margin_sheet_rows_own" ON shopee_margin_sheet_rows FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;

-- Parâmetros (comissão/taxa de transação/imposto/taxa fixa/margem alvo/faixas de cupom),
-- um registro por usuário, igual à aba "Parâmetros" da planilha original.
CREATE TABLE IF NOT EXISTS shopee_margin_sheet_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE shopee_margin_sheet_settings ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'shopee_margin_sheet_settings' AND policyname = 'shopee_margin_sheet_settings_own'
  ) THEN
    EXECUTE 'CREATE POLICY "shopee_margin_sheet_settings_own" ON shopee_margin_sheet_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;
