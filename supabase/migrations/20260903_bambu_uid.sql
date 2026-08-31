-- O worker MQTT precisa do uid da conta Bambu pra montar o username da conexão
-- (formato "u_{uid}", usado pelos clientes MQTT da nuvem Bambu).
ALTER TABLE public.bambu_cloud_accounts
  ADD COLUMN IF NOT EXISTS uid TEXT;
