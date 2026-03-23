-- Campo opcional por impressora para manutenção anual (R$).
ALTER TABLE public.printers
ADD COLUMN IF NOT EXISTS annual_maintenance NUMERIC;

