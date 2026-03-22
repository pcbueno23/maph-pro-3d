-- Preço sugerido para venda direta (PIX/cartão), alinhado à calculadora e ao estoque.

ALTER TABLE products ADD COLUMN IF NOT EXISTS suggested_price_direct NUMERIC;

COMMENT ON COLUMN products.suggested_price_direct IS 'Preço sugerido venda direta (calculadora / wizard)';
