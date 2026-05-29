-- Leads de cadastro (e-mail + WhatsApp) para exportação no admin.
-- Preenchido na primeira gravação em user_contact com telefone.

CREATE TABLE IF NOT EXISTS public.signup_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  whatsapp text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'signup',
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.signup_leads IS 'Snapshot de lead no cadastro (e-mail + WhatsApp).';

CREATE INDEX IF NOT EXISTS idx_signup_leads_created ON public.signup_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signup_leads_email ON public.signup_leads (lower(email));

ALTER TABLE public.signup_leads ENABLE ROW LEVEL SECURITY;

-- Sem policy para anon/authenticated: leitura só via service_role no backend admin.

CREATE OR REPLACE FUNCTION public.capture_signup_lead_from_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uemail text;
  v_phone text;
BEGIN
  v_phone := COALESCE(trim(NEW.phone), '');
  IF v_phone = '' THEN
    RETURN NEW;
  END IF;

  SELECT email INTO uemail FROM auth.users WHERE id = NEW.user_id;

  INSERT INTO public.signup_leads (user_id, email, whatsapp, source)
  VALUES (
    NEW.user_id,
    COALESCE(NULLIF(trim(uemail), ''), ''),
    v_phone,
    'signup'
  )
  ON CONFLICT (user_id) DO UPDATE
    SET whatsapp = EXCLUDED.whatsapp,
        email = COALESCE(NULLIF(EXCLUDED.email, ''), signup_leads.email);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_contact_capture_signup_lead ON public.user_contact;
CREATE TRIGGER on_user_contact_capture_signup_lead
  AFTER INSERT OR UPDATE OF phone ON public.user_contact
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_signup_lead_from_contact();
