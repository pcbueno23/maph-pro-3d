# bambu-worker

Serviço separado (fora do Vercel) que fica conectado o tempo todo via MQTT na
nuvem Bambu Lab pra cada conta conectada no Maph Pro 3D, e grava progresso e
temperatura no Supabase (`bambu_device_status`). O SaaS só lê essa tabela —
não precisa dele pra funcionar, só pra ter telemetria ao vivo.

**Experimental**: os endpoints REST e o protocolo MQTT usados aqui não são
documentados oficialmente pela Bambu Lab — foram mapeados a partir de projetos
open-source (Home Assistant `bambu_lab`, `bambu-connect`, `pybambu`) e nunca
testados por mim contra uma conta/impressora real. Os logs do worker mostram
exatamente onde travar (login, lista de impressoras, conexão MQTT, mensagens
recebidas) pra diagnosticar rápido.

## Rodar localmente

```bash
cd bambu-worker
npm install
cp .env.example .env   # preenche SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

Acompanha o console: ele mostra quantas contas achou, se conectou no MQTT, e
o conteúdo das primeiras mensagens recebidas.

## Publicar (produção)

Qualquer host que rode um container Docker "sempre ligado" serve — não dá pra
usar Vercel (função serverless não fica escutando MQTT continuamente).
Sugestões com plano barato/gratuito pra um serviço pequeno como esse:

- **Railway** (railway.app): cria um projeto, aponta pra pasta `bambu-worker/`
  desse repositório (ou publica esse subdiretório num repo próprio), define as
  variáveis de ambiente (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) no
  painel, e ativa o deploy — o `Dockerfile` já está pronto.
- **Fly.io** (fly.io): `fly launch` dentro da pasta `bambu-worker/` detecta o
  Dockerfile sozinho; depois `fly secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...`
  e `fly deploy`.

`SUPABASE_SERVICE_ROLE_KEY` é a chave "service_role" do mesmo projeto Supabase
do SaaS (Supabase → Settings → API) — nunca a chave anon, e nunca exposta no
site, só nesse worker.

## Como funciona por dentro

- A cada 60s (`POLL_INTERVAL_MS` em `src/index.ts`), relê a tabela
  `bambu_cloud_accounts` — conecta contas novas, desconecta as que sumiram
  (usuário desconectou pelo SaaS).
- Pra cada conta, busca a lista de impressoras na API da Bambu e abre 1
  conexão MQTT (`src/bambuMqtt.ts`), assinando `device/{id}/report` de cada
  uma. Ao conectar, pede o snapshot completo (`pushall`).
- Cada mensagem recebida vira uma linha atualizada em `bambu_device_status`
  (status de impressão, % de progresso, tempo restante, temperatura do bico e
  da mesa) — a coluna `raw` guarda o JSON inteiro recebido, útil pra ver campos
  que ainda não estamos extraindo.
