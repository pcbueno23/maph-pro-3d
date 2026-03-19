-- Assets (uploads) de produtos: imagem principal e arquivos anexos
-- Usa Supabase Storage + tabela de metadados.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- Tabela de metadados
-- =========================
CREATE TABLE IF NOT EXISTS product_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- 'image' | 'file'
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  storage_bucket TEXT NOT NULL DEFAULT 'product-assets',
  storage_path TEXT NOT NULL,
  public_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_assets_user_id ON product_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_product_assets_product_id ON product_assets(product_id);
CREATE INDEX IF NOT EXISTS idx_product_assets_kind ON product_assets(kind);

ALTER TABLE product_assets ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_assets' AND policyname = 'product_assets_own'
  ) THEN
    EXECUTE 'CREATE POLICY "product_assets_own" ON product_assets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;

-- =========================
-- Bucket (Supabase Storage)
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'product-assets') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('product-assets', 'product-assets', true);
  END IF;
END $$;

-- Policies em storage.objects: restringe ao "prefixo do usuário" no path.
-- Padrão de path: <user_id>/<product_id>/<uuid>_<filename>
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'product_assets_read_own'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "product_assets_read_own" ON storage.objects
      FOR SELECT
      USING (
        bucket_id = 'product-assets'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'product_assets_write_own'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "product_assets_write_own" ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'product-assets'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'product_assets_update_own'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "product_assets_update_own" ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'product-assets'
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
      WITH CHECK (
        bucket_id = 'product-assets'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'product_assets_delete_own'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "product_assets_delete_own" ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'product-assets'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
    $pol$;
  END IF;
END $$;

