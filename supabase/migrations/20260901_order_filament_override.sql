-- Permite escolher, por ordem de produção, um filamento diferente do que está na
-- ficha técnica (BOM) do produto — nem toda impressão da mesma peça usa o mesmo rolo.
-- Quando definido, substitui só a(s) linha(s) de material com category='filament' do
-- BOM (custo estimado e baixa de estoque), mantendo a mesma quantidade da ficha técnica.
ALTER TABLE public.production_orders
  ADD COLUMN IF NOT EXISTS filament_supply_id UUID REFERENCES public.supplies(id) ON DELETE SET NULL;
