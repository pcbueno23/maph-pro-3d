-- Fase 2 do dossiê 3D Hunt: (A) sinalizar custo de produto desatualizado quando um
-- insumo do BOM mudou de preço depois do último cálculo salvo; (B) rastreio de
-- manutenção de impressora com alerta por horas acumuladas de impressão.
--
-- Usamos trigger pra rastrear "quando o VALOR realmente mudou" (não "quando a linha
-- foi tocada") — updated_at de products/supplies já é tocado por saves que não mexem
-- em custo (ex.: editar SKU, baixa de estoque automática), então não serve como proxy.

ALTER TABLE public.supplies
  ADD COLUMN IF NOT EXISTS unit_cost_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE OR REPLACE FUNCTION public.supplies_track_unit_cost_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.unit_cost IS DISTINCT FROM OLD.unit_cost THEN
    NEW.unit_cost_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_supplies_track_unit_cost_change ON public.supplies;
CREATE TRIGGER trg_supplies_track_unit_cost_change
  BEFORE UPDATE ON public.supplies
  FOR EACH ROW EXECUTE FUNCTION public.supplies_track_unit_cost_change();

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS total_cost_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE OR REPLACE FUNCTION public.products_track_total_cost_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_cost IS DISTINCT FROM OLD.total_cost THEN
    NEW.total_cost_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_track_total_cost_change ON public.products;
CREATE TRIGGER trg_products_track_total_cost_change
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.products_track_total_cost_change();

-- Manutenção de impressora
ALTER TABLE public.printers
  ADD COLUMN IF NOT EXISTS maintenance_alert_hours NUMERIC;

CREATE TABLE IF NOT EXISTS printer_maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  printer_id UUID NOT NULL REFERENCES public.printers(id) ON DELETE CASCADE,
  performed_at DATE NOT NULL,
  type TEXT NOT NULL,
  cost NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE printer_maintenance_logs ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'printer_maintenance_logs' AND policyname = 'printer_maintenance_logs_own'
  ) THEN
    EXECUTE 'CREATE POLICY "printer_maintenance_logs_own" ON printer_maintenance_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS printer_maintenance_logs_printer_idx ON printer_maintenance_logs(printer_id, performed_at DESC);
