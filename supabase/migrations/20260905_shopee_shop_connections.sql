-- Integração Shopee via Open Platform (categoria "Seller In House System" — app de uso
-- próprio, não ISV multi-lojista). Guarda só os tokens da autorização OAuth-like da
-- Shopee ("shop authorization"), nunca senha. RLS ligado SEM policy: contém tokens,
-- só service_role acessa via rotas server-side (mesmo padrão de affiliates/bambu).
CREATE TABLE IF NOT EXISTS shopee_shop_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id BIGINT NOT NULL,
  shop_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  access_token_expires_at TIMESTAMPTZ NOT NULL,
  last_synced_at TIMESTAMPTZ,
  last_order_time BIGINT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE shopee_shop_connections ENABLE ROW LEVEL SECURITY;
