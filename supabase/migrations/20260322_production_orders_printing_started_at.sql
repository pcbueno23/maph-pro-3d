-- Momento em que a ordem entrou em "Em impressão" (para cronômetro de avisos na UI).
ALTER TABLE production_orders
  ADD COLUMN IF NOT EXISTS printing_started_at TIMESTAMPTZ;

COMMENT ON COLUMN production_orders.printing_started_at IS
  'Preenchido ao entrar no status printing; usado com tempo estimado do produto × quantidade.';
