-- Permite ocultar um produto da listagem "solta" (fora de grupos de kit) sem excluí-lo
-- nem afetar os kits que o referenciam.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS hidden_standalone boolean NOT NULL DEFAULT false;
