-- Material do insumo (ex.: PLA, PETG, ABS) — separado do nome livre, pra poder mostrar
-- e filtrar por material na lista de insumos sem depender de texto solto no nome.
ALTER TABLE supplies ADD COLUMN IF NOT EXISTS material TEXT;
