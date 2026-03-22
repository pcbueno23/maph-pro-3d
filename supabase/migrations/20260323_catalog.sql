-- Catálogo público: produtos marcados + link compartilhável + exibir preços

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS catalog_visible BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS catalog_sort INTEGER;

CREATE TABLE IF NOT EXISTS catalog_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  public_slug TEXT NOT NULL UNIQUE,
  show_prices BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalog_settings_slug ON catalog_settings(public_slug);

ALTER TABLE catalog_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'catalog_settings' AND policyname = 'catalog_settings_own'
  ) THEN
    EXECUTE 'CREATE POLICY "catalog_settings_own" ON catalog_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;

-- Leitura pública por slug (sem login): lista produtos do catálogo
CREATE OR REPLACE FUNCTION public.get_catalog_public(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_show_prices boolean;
  v_products jsonb;
BEGIN
  SELECT cs.user_id, cs.show_prices
  INTO v_user_id, v_show_prices
  FROM catalog_settings cs
  WHERE cs.public_slug = p_slug
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', x.id,
          'name', x.name,
          'sku', x.sku,
          'description', x.description,
          'weight', x.weight,
          'price', x.price_out,
          'currency', x.currency,
          'printTimeMinutes', x.print_time_minutes,
          'marketplace', x.marketplace,
          'imageUrl', x.image_url
        )
        ORDER BY x.sort_ord NULLS LAST, x.name
      )
      FROM (
        SELECT
          p.id,
          p.name,
          p.sku,
          p.description,
          p.weight,
          CASE WHEN v_show_prices THEN p.price ELSE NULL END AS price_out,
          p.currency,
          p.print_time_minutes,
          p.marketplace,
          p.catalog_sort AS sort_ord,
          (
            SELECT pa.public_url
            FROM product_assets pa
            WHERE pa.product_id = p.id AND pa.kind = 'image'
            ORDER BY pa.created_at ASC
            LIMIT 1
          ) AS image_url
        FROM products p
        WHERE p.user_id = v_user_id
          AND p.catalog_visible = true
      ) x
    ),
    '[]'::jsonb
  )
  INTO v_products;

  RETURN jsonb_build_object(
    'ok', true,
    'showPrices', v_show_prices,
    'products', v_products
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_catalog_public(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_catalog_public(text) TO authenticated;
