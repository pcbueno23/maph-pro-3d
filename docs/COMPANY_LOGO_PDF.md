# Logo da empresa no PDF (Storage)

O Supabase Auth **não é adequado** para guardar logo em base64 dentro de `user_metadata`: o JWT fica grande demais e o campo `company_logo` pode **não persistir**, enquanto nome/CNPJ/e-mail continuam salvos.

## O que fazer

1. No **SQL Editor** do Supabase, execute o arquivo  
   `supabase/migrations/20260320_company_logos_storage.sql`  
   (cria o bucket público `company-logos` e as policies de escrita por usuário).

2. No app: **Conta** → escolha o logo → **Salvar alterações**.  
   O arquivo vai para `company-logos/<seu_user_id>/logo.jpg` e no perfil fica só a **URL pública** (`company_logo_url`).

3. Gere o PDF de **Orçamentos** de novo.

## Fallback

Se ainda existir `company_logo` antigo em base64 (pequeno), o PDF tenta usar; prioridade é `company_logo_url` → `company_logo` → `avatar_url`.
