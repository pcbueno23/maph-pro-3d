-- Auditoria de ações de admin, config global do site e métricas (RPC só service_role).

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email text NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON admin_audit_log (created_at DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Sem policy para anon/authenticated: só service_role acessa.

CREATE TABLE IF NOT EXISTS app_site_config (
  id text PRIMARY KEY DEFAULT 'default',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app_site_config (id) VALUES ('default')
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE app_site_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_site_config_select_all" ON app_site_config;
CREATE POLICY "app_site_config_select_all" ON app_site_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Métricas agregadas (somente chamada com service_role no backend).
CREATE OR REPLACE FUNCTION public.admin_metrics_counts()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'users_total', (SELECT COUNT(*)::int FROM auth.users),
    'users_7d', (SELECT COUNT(*)::int FROM auth.users WHERE created_at >= now() - interval '7 days'),
    'users_30d', (SELECT COUNT(*)::int FROM auth.users WHERE created_at >= now() - interval '30 days'),
    'banned', (
      SELECT COUNT(*)::int FROM auth.users
      WHERE banned_until IS NOT NULL AND banned_until > now()
    )
  );
$$;

REVOKE ALL ON FUNCTION public.admin_metrics_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_metrics_counts() TO service_role;
