-- Renomeia "equipments" para "printers" (impressoras) e ajusta referências.
-- Seguro para rodar mesmo que já esteja renomeado (verificações via catálogo).

DO $$
BEGIN
  -- Renomear tabela principal
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='equipments')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='printers')
  THEN
    EXECUTE 'ALTER TABLE public.equipments RENAME TO printers';
  END IF;

  -- products: default_equipment_id -> default_printer_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='products' AND column_name='default_equipment_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='products' AND column_name='default_printer_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.products RENAME COLUMN default_equipment_id TO default_printer_id';
  END IF;

  -- production_orders: equipment_id -> printer_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='production_orders' AND column_name='equipment_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='production_orders' AND column_name='printer_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.production_orders RENAME COLUMN equipment_id TO printer_id';
  END IF;
END $$;

