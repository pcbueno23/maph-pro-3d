-- Telefone de contato (WhatsApp) visível no Table Editor e independente de quirks do Auth metadata.

CREATE TABLE IF NOT EXISTS public.user_contact (
  user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  phone TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_contact IS 'Telefone de contato informado no cadastro / Conta (não é login SMS).';

CREATE INDEX IF NOT EXISTS idx_user_contact_updated ON public.user_contact (updated_at DESC);

ALTER TABLE public.user_contact ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_contact_select_own"
  ON public.user_contact FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_contact_insert_own"
  ON public.user_contact FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_contact_update_own"
  ON public.user_contact FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Copia telefone dos metadados na criação/atualização do usuário (chave contact_whatsapp evita conflito com coluna phone do Auth).
CREATE OR REPLACE FUNCTION public.sync_user_contact_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v TEXT;
BEGIN
  v := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'contact_whatsapp'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'contact_phone'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'phone'), ''),
    ''
  );
  INSERT INTO public.user_contact (user_id, phone, updated_at)
  VALUES (NEW.id, v, now())
  ON CONFLICT (user_id) DO UPDATE
    SET phone = EXCLUDED.phone, updated_at = now();
  RETURN NEW;
END;
$$;

GRANT SELECT, INSERT, UPDATE ON public.user_contact TO authenticated;

DROP TRIGGER IF EXISTS on_auth_user_sync_user_contact ON auth.users;
CREATE TRIGGER on_auth_user_sync_user_contact
  AFTER INSERT OR UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.sync_user_contact_from_auth();
