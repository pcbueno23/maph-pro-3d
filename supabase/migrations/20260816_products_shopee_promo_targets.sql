-- Alvos de promoção Shopee por produto (aba "Promoções Shopee") — usados hoje só como
-- cola manual pro usuário digitar no painel da Shopee, sem nenhuma integração real com a API.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS shopee_promo_preco_cadastro numeric,
  ADD COLUMN IF NOT EXISTS shopee_promo_desconto_percent numeric,
  ADD COLUMN IF NOT EXISTS shopee_promo_cupom_percent numeric,
  ADD COLUMN IF NOT EXISTS shopee_promo_cupom_max_rs numeric,
  ADD COLUMN IF NOT EXISTS shopee_promo_oferta_relampago_percent numeric;
