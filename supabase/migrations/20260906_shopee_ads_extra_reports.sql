-- Amplia o import de anúncios Shopee com os outros 3 exports disponíveis em
-- "Central de Marketing → Anúncios → Exportar dados": palavra-chave/locação,
-- GMV Max detalhado por produto, e grupos de anúncios. Baseado em arquivos-modelo
-- reais fornecidos pelo usuário (não suposição de formato).
ALTER TABLE shopee_report_imports DROP CONSTRAINT IF EXISTS shopee_report_imports_report_type_check;
ALTER TABLE shopee_report_imports ADD CONSTRAINT shopee_report_imports_report_type_check
  CHECK (report_type IN (
    'performance_produto', 'shopee_ads', 'minha_renda',
    'shopee_ads_keyword', 'shopee_ads_gmvmax', 'shopee_ads_group'
  ));

CREATE TABLE IF NOT EXISTS shopee_ads_keyword_performance (
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
  keyword_or_location TEXT,
  match_type TEXT,
  is_automatic BOOLEAN NOT NULL DEFAULT FALSE,
  impressions INTEGER,
  clicks INTEGER,
  ctr NUMERIC,
  conversions INTEGER,
  direct_conversions INTEGER,
  conversion_rate NUMERIC,
  direct_conversion_rate NUMERIC,
  cost_per_conversion NUMERIC,
  cost_per_conversion_direct NUMERIC,
  items_sold INTEGER,
  items_sold_direct INTEGER,
  gmv NUMERIC,
  direct_revenue NUMERIC,
  expenses NUMERIC,
  roas NUMERIC,
  direct_roas NUMERIC,
  acos NUMERIC,
  direct_acos NUMERIC,
  product_impressions INTEGER,
  product_clicks INTEGER,
  product_ctr NUMERIC,
  period_start DATE,
  period_end DATE
);
ALTER TABLE shopee_ads_keyword_performance ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'shopee_ads_keyword_performance' AND policyname = 'shopee_ads_keyword_performance_own'
  ) THEN
    EXECUTE 'CREATE POLICY "shopee_ads_keyword_performance_own" ON shopee_ads_keyword_performance FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS shopee_ads_keyword_performance_import_idx ON shopee_ads_keyword_performance(import_id);

CREATE TABLE IF NOT EXISTS shopee_ads_gmvmax_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  import_id UUID NOT NULL REFERENCES shopee_report_imports(id) ON DELETE CASCADE,
  product_name TEXT,
  item_id TEXT,
  matched_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  is_store_total BOOLEAN NOT NULL DEFAULT FALSE,
  impressions INTEGER,
  clicks INTEGER,
  ctr NUMERIC,
  conversions INTEGER,
  direct_conversions INTEGER,
  conversion_rate NUMERIC,
  direct_conversion_rate NUMERIC,
  cost_per_conversion NUMERIC,
  cost_per_conversion_direct NUMERIC,
  items_sold INTEGER,
  items_sold_direct INTEGER,
  gmv NUMERIC,
  direct_revenue NUMERIC,
  expenses NUMERIC,
  roas NUMERIC,
  direct_roas NUMERIC,
  acos NUMERIC,
  direct_acos NUMERIC,
  voucher_amount NUMERIC,
  vouchered_sales NUMERIC,
  period_start DATE,
  period_end DATE
);
ALTER TABLE shopee_ads_gmvmax_performance ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'shopee_ads_gmvmax_performance' AND policyname = 'shopee_ads_gmvmax_performance_own'
  ) THEN
    EXECUTE 'CREATE POLICY "shopee_ads_gmvmax_performance_own" ON shopee_ads_gmvmax_performance FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS shopee_ads_gmvmax_performance_import_idx ON shopee_ads_gmvmax_performance(import_id);

CREATE TABLE IF NOT EXISTS shopee_ads_group_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  import_id UUID NOT NULL REFERENCES shopee_report_imports(id) ON DELETE CASCADE,
  ad_name TEXT,
  status TEXT,
  ad_type TEXT,
  item_id TEXT,
  matched_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  bid_method TEXT,
  impressions INTEGER,
  clicks INTEGER,
  ctr NUMERIC,
  conversions INTEGER,
  direct_conversions INTEGER,
  conversion_rate NUMERIC,
  direct_conversion_rate NUMERIC,
  cost_per_conversion NUMERIC,
  cost_per_conversion_direct NUMERIC,
  items_sold INTEGER,
  items_sold_direct INTEGER,
  gmv NUMERIC,
  direct_revenue NUMERIC,
  expenses NUMERIC,
  roas NUMERIC,
  direct_roas NUMERIC,
  acos NUMERIC,
  direct_acos NUMERIC,
  voucher_amount NUMERIC,
  vouchered_sales NUMERIC,
  period_start DATE,
  period_end DATE
);
ALTER TABLE shopee_ads_group_performance ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'shopee_ads_group_performance' AND policyname = 'shopee_ads_group_performance_own'
  ) THEN
    EXECUTE 'CREATE POLICY "shopee_ads_group_performance_own" ON shopee_ads_group_performance FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS shopee_ads_group_performance_import_idx ON shopee_ads_group_performance(import_id);
