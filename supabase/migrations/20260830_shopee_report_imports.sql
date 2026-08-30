-- Importação de relatórios reais da Shopee (Performance do Produto, Shopee Ads) — ver
-- app/relatorios-shopee/page.tsx. Cada upload vira uma linha em shopee_report_imports
-- (metadado) + várias linhas na tabela de fato do relatório correspondente.
--
-- shopee_item_id em products: só o relatório "Performance do Produto" traz ID do Item E
-- SKU no mesmo lugar — importar esse relatório também preenche esse campo por SKU casado,
-- o que depois permite casar o relatório de Shopee Ads (que só tem ID do Item, sem SKU)
-- com o produto certo.

CREATE TABLE IF NOT EXISTS shopee_report_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('performance_produto', 'shopee_ads', 'minha_renda')),
  file_name TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  row_count INTEGER NOT NULL DEFAULT 0,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE shopee_report_imports ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'shopee_report_imports' AND policyname = 'shopee_report_imports_own'
  ) THEN
    EXECUTE 'CREATE POLICY "shopee_report_imports_own" ON shopee_report_imports FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS shopee_report_imports_user_idx ON shopee_report_imports(user_id, report_type, imported_at DESC);

CREATE TABLE IF NOT EXISTS shopee_product_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  import_id UUID NOT NULL REFERENCES shopee_report_imports(id) ON DELETE CASCADE,
  item_id TEXT,
  product_name TEXT,
  variation_id TEXT,
  variation_name TEXT,
  sku TEXT,
  parent_sku TEXT,
  matched_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  sales_ordered NUMERIC,
  sales_paid NUMERIC,
  impressions INTEGER,
  clicks INTEGER,
  ctr NUMERIC,
  orders_made INTEGER,
  orders_paid INTEGER,
  units_ordered INTEGER,
  units_paid INTEGER,
  buyers_ordered INTEGER,
  buyers_paid INTEGER,
  conversion_rate_ordered NUMERIC,
  conversion_rate_paid NUMERIC,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE shopee_product_performance ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'shopee_product_performance' AND policyname = 'shopee_product_performance_own'
  ) THEN
    EXECUTE 'CREATE POLICY "shopee_product_performance_own" ON shopee_product_performance FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS shopee_product_performance_import_idx ON shopee_product_performance(import_id);
CREATE INDEX IF NOT EXISTS shopee_product_performance_user_idx ON shopee_product_performance(user_id, sku);

CREATE TABLE IF NOT EXISTS shopee_ads_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  import_id UUID NOT NULL REFERENCES shopee_report_imports(id) ON DELETE CASCADE,
  ad_name TEXT,
  status TEXT,
  ad_type TEXT,
  item_id TEXT,
  matched_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  bid_method TEXT,
  placement TEXT,
  ad_start_date DATE,
  ad_end_date DATE,
  impressions INTEGER,
  clicks INTEGER,
  ctr NUMERIC,
  add_to_cart INTEGER,
  conversions INTEGER,
  direct_conversions INTEGER,
  conversion_rate NUMERIC,
  direct_conversion_rate NUMERIC,
  cost_per_conversion NUMERIC,
  items_sold INTEGER,
  items_sold_direct INTEGER,
  gmv NUMERIC,
  direct_revenue NUMERIC,
  expenses NUMERIC,
  roas NUMERIC,
  direct_roas NUMERIC,
  acos NUMERIC,
  direct_acos NUMERIC,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE shopee_ads_performance ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'shopee_ads_performance' AND policyname = 'shopee_ads_performance_own'
  ) THEN
    EXECUTE 'CREATE POLICY "shopee_ads_performance_own" ON shopee_ads_performance FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS shopee_ads_performance_import_idx ON shopee_ads_performance(import_id);
CREATE INDEX IF NOT EXISTS shopee_ads_performance_user_idx ON shopee_ads_performance(user_id, item_id);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS shopee_item_id TEXT;
CREATE INDEX IF NOT EXISTS products_shopee_item_id_idx ON public.products(user_id, shopee_item_id);
