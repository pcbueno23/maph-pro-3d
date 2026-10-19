/**
 * Cliente da API de nuvem da Bambu Lab — NÃO é uma API pública/documentada oficial.
 * Baseado no que projetos open-source (Home Assistant bambu_lab, pybambu,
 * bambu-connect) já mapearam por engenharia reversa — pode estar desatualizado ou
 * errado nalgum detalhe, já que não tenho como testar contra uma conta/impressora
 * real. Os erros aqui devolvem o corpo bruto da resposta da Bambu de propósito,
 * pra dar pra diagnosticar rápido com o usuário testando ao vivo.
 */

const REGION_BASE: Record<string, string> = {
  global: "https://api.bambulab.com",
  china: "https://api.bambulab.cn",
};

function baseUrl(region: string): string {
  return REGION_BASE[region] ?? REGION_BASE.global;
}

export type BambuLoginResult =
  | { ok: true; accessToken: string; refreshToken: string | null; expiresAt: string | null; uid: string | null }
  | { ok: true; needsVerification: true }
  | { ok: false; status: number; body: string };

/** O uid aparece em formatos diferentes conforme a versão da API — tenta os mais prováveis. */
function extractUid(json: any): string | null {
  const raw =
    json?.uid ?? json?.user?.uid ?? json?.userId ?? json?.user_id ?? json?.user?.id ?? null;
  return raw != null ? String(raw) : null;
}

/**
 * O login da Bambu normalmente NÃO devolve um campo "uid" solto — o uid vem embutido
 * dentro do próprio accessToken (JWT), na claim "username" no formato "u_<uid>" (mesmo
 * formato já usado como username da conexão MQTT em bambuMqttPoll.ts). Técnica documentada
 * nos projetos open-source (pybambu decodifica o JWT do mesmo jeito) — mais confiável que
 * tentar adivinhar o formato do JSON de resposta do login.
 */
function decodeUidFromAccessToken(accessToken: string): string | null {
  try {
    const payloadB64 = accessToken.split(".")[1];
    if (!payloadB64) return null;
    const normalized = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(Buffer.from(normalized, "base64").toString("utf8"));
    const username = json?.username;
    if (typeof username === "string") {
      const match = username.match(/^u_(.+)$/);
      return match ? match[1] : username;
    }
    const sub = json?.sub;
    return sub != null ? String(sub) : null;
  } catch {
    return null;
  }
}

async function postJson(url: string, body: unknown, token?: string) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // corpo não é JSON — mantém texto bruto pra diagnóstico
  }
  return { ok: res.ok, status: res.status, text, json };
}

/** Passo 1: tenta login com e-mail+senha. Se a Bambu exigir verificação, dispara o código por e-mail sozinha. */
export async function bambuLogin(
  region: string,
  email: string,
  password: string,
): Promise<BambuLoginResult> {
  const res = await postJson(`${baseUrl(region)}/v1/user-service/user/login`, {
    account: email,
    password,
  });

  if (!res.ok) {
    return { ok: false, status: res.status, body: res.text.slice(0, 500) };
  }

  if (res.json?.accessToken) {
    return {
      ok: true,
      accessToken: res.json.accessToken,
      refreshToken: res.json.refreshToken ?? null,
      expiresAt: null,
      uid: extractUid(res.json) ?? decodeUidFromAccessToken(res.json.accessToken),
    };
  }

  // Conta pede verificação por código — a própria chamada acima já deve ter
  // disparado o e-mail com o código nesse fluxo da Bambu.
  if (res.json?.loginType === "verifyCode" || res.json?.needCode) {
    return { ok: true, needsVerification: true };
  }

  return { ok: false, status: 200, body: res.text.slice(0, 500) };
}

/** Passo 2 (só quando bambuLogin pedir verificação): confirma com o código recebido por e-mail. */
export async function bambuLoginWithCode(
  region: string,
  email: string,
  code: string,
): Promise<BambuLoginResult> {
  const res = await postJson(`${baseUrl(region)}/v1/user-service/user/login`, {
    account: email,
    code,
  });
  if (!res.ok) {
    return { ok: false, status: res.status, body: res.text.slice(0, 500) };
  }
  if (res.json?.accessToken) {
    return {
      ok: true,
      accessToken: res.json.accessToken,
      refreshToken: res.json.refreshToken ?? null,
      expiresAt: null,
      uid: extractUid(res.json) ?? decodeUidFromAccessToken(res.json.accessToken),
    };
  }
  return { ok: false, status: 200, body: res.text.slice(0, 500) };
}

export type BambuDevice = {
  devId: string;
  name: string;
  online: boolean;
  model: string | null;
};

export async function bambuListDevices(
  region: string,
  accessToken: string,
): Promise<{ ok: true; devices: BambuDevice[] } | { ok: false; status: number; body: string }> {
  const res = await fetch(`${baseUrl(region)}/v1/iot-service/api/user/bind`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const text = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status, body: text.slice(0, 500) };
  }
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, status: 200, body: text.slice(0, 500) };
  }
  const list = Array.isArray(json?.devices) ? json.devices : [];
  return {
    ok: true,
    devices: list.map((d: any) => ({
      devId: d.dev_id ?? d.devId ?? "",
      name: d.name ?? d.dev_name ?? "Impressora Bambu",
      online: Boolean(d.online ?? d.dev_online),
      model: d.dev_model_name ?? d.model ?? null,
    })),
  };
}
