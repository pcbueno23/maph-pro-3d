-- Link do anúncio na Shopee (coluna W da planilha, opcional) — pra conferir rápido se os
-- valores calculados batem com o anúncio real.
ALTER TABLE shopee_margin_sheet_rows ADD COLUMN IF NOT EXISTS link TEXT;
