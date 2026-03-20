-- Logos da empresa para PDF / Conta: URL pública curta em user_metadata (evita base64 gigante no JWT).
-- Path: company-logos/<user_id>/logo.jpg

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'company-logos') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('company-logos', 'company-logos', true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'company_logos_read_public'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "company_logos_read_public" ON storage.objects
      FOR SELECT
      USING (bucket_id = 'company-logos');
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'company_logos_insert_own'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "company_logos_insert_own" ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'company-logos'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'company_logos_update_own'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "company_logos_update_own" ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'company-logos'
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
      WITH CHECK (
        bucket_id = 'company-logos'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'company_logos_delete_own'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "company_logos_delete_own" ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'company-logos'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
    $pol$;
  END IF;
END $$;
