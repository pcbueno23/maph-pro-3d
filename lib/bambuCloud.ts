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
  | {
      ok: true;
      accessToken: string;
      refreshToken: string | null;
      expiresAt: string | null;
      uid: string | null;
      /** Preenchido só quando `uid` veio null — pra parar de adivinhar nome de campo e
       * ver o formato real que a Bambu respondeu (token em si nunca aparece aqui). */
      debugLoginJson?: unknown;
      debugJwtPayload?: unknown;
    }
  | { ok: true; needsVerification: true }
  | { ok: false; status: number; body: string };

/** O uid aparece em formatos diferentes conforme a versão da API — tenta os mais prováveis. */
function extractUid(json: any): string | null {
  const raw =
    json?.uid ?? json?.user?.uid ?? json?.userId ?? json?.user_id ?? json?.user?.id ?? null;
  return raw != null ? String(raw) : null;
}

/** Decodifica só o payload do JWT (não exige validar assinatura — é usado aqui como
 * leitura de dado, não como autenticação, a própria Bambu já autenticou). */
function decodeJwtPayload(token: string): any {
  try {
    const payloadB64 = token.split(".")[1];
    if (!payloadB64) return null;
    const normalized = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(normalized, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * Tenta achar o uid dentro do payload do JWT do accessToken — alguns projetos
 * open-source (pybambu) leem a claim "username" (formato "u_<uid>", mesmo usado como
 * username da conexão MQTT). Mantido como 2ª tentativa; se também vier null, o chamador
 * expõe o payload bruto em vez de insistir num 3º palpite de nome de campo.
 */
function extractUidFromJwtPayload(payload: any): string | null {
  if (!payload || typeof payload !== "object") return null;
  const direct = payload.uid ?? payload.userId ?? payload.user_id ?? payload.id ?? null;
  if (direct != null) return String(direct);
  const username = payload.username;
  if (typeof username === "string") {
    const match = username.match(/^u_(.+)$/);
    return match ? match[1] : username;
  }
  const sub = payload.sub;
  return sub != null ? String(sub) : null;
}

/** Nunca devolve o valor de accessToken/refreshToken pro cliente — só o formato/tamanho. */
function redactTokens(json: any): any {
  if (!json || typeof json !== "object") return json;
  const clone: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(json)) {
    clone[k] =
      (k === "accessToken" || k === "refreshToken") && typeof v === "string"
        ? `[redigido, ${v.length} caracteres]`
        : v;
  }
  return clone;
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
    const jwtPayload = decodeJwtPayload(res.json.accessToken);
    const uid = extractUid(res.json) ?? extractUidFromJwtPayload(jwtPayload);
    return {
      ok: true,
      accessToken: res.json.accessToken,
      refreshToken: res.json.refreshToken ?? null,
      expiresAt: null,
      uid,
      ...(uid == null ? { debugLoginJson: redactTokens(res.json), debugJwtPayload: jwtPayload } : {}),
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
    const jwtPayload = decodeJwtPayload(res.json.accessToken);
    const uid = extractUid(res.json) ?? extractUidFromJwtPayload(jwtPayload);
    return {
      ok: true,
      accessToken: res.json.accessToken,
      refreshToken: res.json.refreshToken ?? null,
      expiresAt: null,
      uid,
      ...(uid == null ? { debugLoginJson: redactTokens(res.json), debugJwtPayload: jwtPayload } : {}),
    };
  }
  return { ok: false, status: 200, body: res.text.slice(0, 500) };
}

export type BambuDevice = {
  devId: string;
  name: string;
  online: boolean;
  model: string | null;
  /** "RUNNING" | "SUCCESS" | outros — confirmado ao vivo (19/10/2026) nesse mesmo endpoint
   * de listagem, sem precisar de MQTT/uid nenhum. "RUNNING" = imprimindo agora de verdade.
   * Não dá progresso/temperatura/tempo (só o MQTT traria isso), mas é 100% confiável pro
   * "está imprimindo ou não" enquanto o uid pro MQTT não é resolvido. */
  restPrintStatus: string | null;
};

export async function bambuListDevices(
  region: string,
  accessToken: string,
): Promise<
  | { ok: true; devices: BambuDevice[]; rawJson: unknown }
  | { ok: false; status: number; body: string }
> {
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
      model: d.dev_product_name ?? d.dev_model_name ?? d.model ?? null,
      restPrintStatus: d.print_status ?? null,
    })),
    // JSON cru dessa resposta — pode ter um campo de conta/uid que a extração de hoje
    // ignora porque só olha dentro de cada device. Usado só pra diagnóstico (ver app/farm).
    rawJson: json,
  };
}
