-- Custos e preços sugeridos por canal (persistidos com o produto; usados em Peças produzidas e relatórios)
ALTER TABLE products ADD COLUMN IF NOT EXISTS total_cost NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS suggested_price_shopee NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS suggested_price_ml NUMERIC;

COMMENT ON COLUMN products.total_cost IS 'Custo unitário de produção no momento do salvamento';
COMMENT ON COLUMN products.suggested_price_shopee IS 'Preço sugerido Shopee (calculadora)';
COMMENT ON COLUMN products.suggested_price_ml IS 'Preço sugerido Mercado Livre (calculadora)';
