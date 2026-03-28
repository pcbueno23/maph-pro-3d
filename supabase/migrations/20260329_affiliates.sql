-- Sistema de afiliados: criado/gerenciado exclusivamente pelo admin.
-- Sem cadastro público — admin libera cada afiliado manualmente.

CREATE TABLE IF NOT EXISTS affiliates (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text        NOT NULL,
  email          text        UNIQUE NOT NULL,
  code           text        UNIQUE NOT NULL,  -- ex: "JOAO2024" (uppercase)
  commission_rate numeric     NOT NULL DEFAULT 0.20 CHECK (commission_rate >= 0 AND commission_rate <= 1),
  status         text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  pix_key        text,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliates_code   ON affiliates (code);
CREATE INDEX IF NOT EXISTS idx_affiliates_status ON affiliates (status);

ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
-- Sem policy: apenas service_role acessa.

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS affiliate_conversions (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id         uuid        NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  referred_user_email  text        NOT NULL,
  plan                 text        NOT NULL,        -- "pro" | "business"
  amount_cents         int         NOT NULL,        -- valor pago em centavos
  commission_cents     int         NOT NULL,        -- comissão calculada em centavos
  status               text        NOT NULL DEFAULT 'pending'
                                   CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  billing_id           text,                        -- ID do billing AbacatePay (dedup)
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_conversions_billing
  ON affiliate_conversions (billing_id) WHERE billing_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_affiliate
  ON affiliate_conversions (affiliate_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_status
  ON affiliate_conversions (status);

ALTER TABLE affiliate_conversions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid        NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  amount_cents int         NOT NULL,
  status       text        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'processing', 'paid', 'rejected')),
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  paid_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_affiliate
  ON affiliate_payouts (affiliate_id);

ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;
