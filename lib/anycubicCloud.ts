/**
 * Cliente da API de nuvem da Anycubic — NÃO é API pública/documentada oficial. Mapeada por
 * engenharia reversa do projeto open-source hass-anycubic_cloud_v3
 * (github.com/ljschmitt/hass-anycubic_cloud_v3, licença Home Assistant/HACS), que tem
 * suporte confirmado contra a Kobra X. Nunca testado ao vivo por mim contra uma conta real —
 * igual já aconteceu com a Bambu, pode ter nome de campo errado até testar de verdade.
 *
 * O login não é e-mail+senha: o usuário extrai um "access token" de dentro do Anycubic
 * Slicer Next (processo manual, rodando um script do próprio projeto open-source no Windows)
 * e cola esse token no SaaS — ver app/api/anycubic/login/route.ts.
 */
import * as crypto from "crypto";
import { ANYCUBIC_MQTT_CA_PUBLIC_KEY } from "./anycubicCerts";

const BASE_URL = "https://cloud-universe.anycubic.com/p/p/workbench/api";

// Constantes "conhecidas" do app Anycubic Slicer Next — não são segredo por usuário, são
// iguais pra qualquer instalação do programa (extraídas do projeto open-source citado acima).
const APP_ID = "f9b3528877c94d5c9c5af32245db46ef";
const APP_SECRET = "0cf75926606049a3937f56b0373b99fb";
const APP_VERSION_SLICER = "V3.0.0";
const APP_VERSION_WEB = "1.0.0";
const DEVICE_TYPE = "pcf"; // modo "slicer" — só esse modo dá acesso ao MQTT ao vivo
const MQTT_APP_ID = "pcf";
const AUTH_CN = "1";
// O projeto de referência manda User-Agent de navegador só no modo web.
const WEB_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

/** "slicer": token do Slicer Next trocado por sessão (dá MQTT ao vivo). "web": XX-Token do
 * localStorage de cloud-universe.anycubic.com — já é o token de sessão, sem troca e sem MQTT
 * (confirmado em models/auth.py do WaresWichall/hass-anycubic_cloud: device_type "web",
 * versão "1.0.0", supports_mqtt_login só pra slicer/android). */
export type AnycubicAuthMode = "slicer" | "web";

/** Token do site é um JWT ("eyJ...", 3 partes). */
export function looksLikeAnycubicWebToken(token: string): boolean {
  return token.startsWith("eyJ") && token.split(".").length === 3;
}

function md5Hex(input: string): string {
  return crypto.createHash("md5").update(input, "utf8").digest("hex");
}

/** Decodifica só o payload do JWT, sem validar assinatura — usado pra diagnóstico quando o
 * login falha (mesma técnica já usada em lib/bambuCloud.ts). */
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

function signedHeaders(sessionToken?: string, mode: AnycubicAuthMode = "slicer"): Record<string, string> {
  // Nonce só precisa parecer um identificador único — o servidor não parece validar a
  // estrutura temporal do UUID v1 usado pelo projeto original, só usa como string opaca.
  const nonce = crypto.randomUUID();
  const timestamp = Date.now().toString();
  const version = mode === "web" ? APP_VERSION_WEB : APP_VERSION_SLICER;
  const sigInput = `${APP_ID}${timestamp}${version}${APP_SECRET}${nonce}${APP_ID}`;
  const signature = md5Hex(sigInput);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Xx-Device-Type": mode === "web" ? "web" : DEVICE_TYPE,
    "Xx-Is-Cn": AUTH_CN,
    "Xx-Nonce": nonce,
    "Xx-Signature": signature,
    "Xx-Timestamp": timestamp,
    "Xx-Version": version,
    "XX-LANGUAGE": "US",
  };
  if (mode === "web") headers["User-Agent"] = WEB_USER_AGENT;
  if (sessionToken) headers["XX-Token"] = sessionToken;
  return headers;
}

async function apiFetch(
  path: string,
  opts: {
    method?: string;
    body?: unknown;
    sessionToken?: string;
    query?: Record<string, string>;
    mode?: AnycubicAuthMode;
  } = {},
) {
  const { method = "GET", body, sessionToken, query, mode } = opts;
  let url = `${BASE_URL}${path}`;
  if (query) {
    const qs = new URLSearchParams(query).toString();
    if (qs) url += `?${qs}`;
  }
  const res = await fetch(url, {
    method,
    headers: signedHeaders(sessionToken, mode),
    body: body != null ? JSON.stringify(body) : undefined,
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

export type AnycubicLoginResult =
  | { ok: true; sessionToken: string }
  | {
      ok: false;
      status: number;
      body: string;
      /** Diagnóstico pra quando a troca falha — payload do JWT (sem validar assinatura) e
       * os valores (não-secretos) usados pra assinar a requisição, pra cruzar com o erro. */
      debugJwtPayload?: unknown;
      debugRequest?: { appId: string; appVersion: string; deviceType: string; endpoint: string };
    };

/** Troca o access_token extraído do Anycubic Slicer Next por um token de sessão (XX-Token),
 * usado nas chamadas REST seguintes. */
export async function anycubicLoginWithSlicerToken(slicerAccessToken: string): Promise<AnycubicLoginResult> {
  const endpoint = "/v3/public/loginWithAccessToken";
  const res = await apiFetch(endpoint, {
    method: "POST",
    body: { device_type: DEVICE_TYPE, access_token: slicerAccessToken },
  });
  const debugRequest = { appId: APP_ID, appVersion: APP_VERSION_SLICER, deviceType: DEVICE_TYPE, endpoint };
  const debugJwtPayload = decodeJwtPayload(slicerAccessToken);
  if (!res.ok) {
    return { ok: false, status: res.status, body: res.text.slice(0, 500), debugJwtPayload, debugRequest };
  }
  const token = res.json?.data?.token;
  if (!token) {
    return { ok: false, status: 200, body: res.text.slice(0, 500), debugJwtPayload, debugRequest };
  }
  return { ok: true, sessionToken: String(token) };
}

export type AnycubicDevice = {
  devId: string;
  name: string;
  online: boolean;
  model: string | null;
  machineType: string | null;
  isPrinting: boolean;
  nozzleTemper: number | null;
  bedTemper: number | null;
};

export async function anycubicListDevices(
  sessionToken: string,
  mode: AnycubicAuthMode = "slicer",
): Promise<{ ok: true; devices: AnycubicDevice[]; rawJson: unknown } | { ok: false; status: number; body: string }> {
  const res = await apiFetch("/work/printer/getPrinters", { sessionToken, mode });
  if (!res.ok) return { ok: false, status: res.status, body: res.text.slice(0, 500) };
  // A API responde HTTP 200 mesmo com token inválido — o erro vem em "code" (1 = sucesso),
  // como no {"code":0,"msg":"Failed to get user info..."} da troca de token.
  if (res.json?.code != null && Number(res.json.code) !== 1) {
    return { ok: false, status: res.status, body: res.text.slice(0, 500) };
  }
  const list = Array.isArray(res.json?.data) ? res.json.data : [];
  return {
    ok: true,
    devices: list.map((d: any) => ({
      devId: String(d.id ?? ""),
      name: d.name ?? "Impressora Anycubic",
      online: Number(d.device_status) === 1,
      model: d.model ?? d.machine_name ?? null,
      machineType: d.type != null ? String(d.type) : null,
      isPrinting: Boolean(d.is_printing),
      nozzleTemper: typeof d.parameter?.curr_nozzle_temp === "number" ? d.parameter.curr_nozzle_temp : null,
      bedTemper: typeof d.parameter?.curr_hotbed_temp === "number" ? d.parameter.curr_hotbed_temp : null,
    })),
    rawJson: res.json,
  };
}

/** print_status do projeto (não confundir com o device_status/is_printing da impressora) —
 * confirmado no enums.py do projeto de referência (AnycubicPrintStatus). */
export const ANYCUBIC_PRINT_STATUS = {
  PRINTING: 1,
  COMPLETE: 2,
  CANCELLED: 3,
  DOWNLOADING: 4,
  CHECKING: 5,
  PREHEATING: 6,
  SLICING: 7,
  LEVELING: 9,
} as const;

export type AnycubicProjectInfo = {
  progressPercent: number | null;
  remainingMinutes: number | null;
  elapsedMinutes: number | null;
  layerNum: number | null;
  totalLayerNum: number | null;
  fileName: string | null;
  printStatus: number | null;
};

function numOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * GET /work/project/getProjects — dá progresso/tempo/camada direto via REST, SEM precisar
 * de MQTT (nem do token do Slicer Next). Confirmado no projeto de referência
 * (data_models/project.py `from_list_json`): a API não filtra por impressora na query, então
 * busca a lista inteira (paginada) e pega o 1º projeto cujo printer_id bate com o nosso —
 * mesmo critério usado lá (`get_latest_project`), "primeiro da lista", não necessariamente
 * o mais recente por timestamp.
 */
export async function anycubicLatestProjectForPrinter(
  sessionToken: string,
  printerId: string,
  mode: AnycubicAuthMode,
): Promise<
  | { ok: true; project: AnycubicProjectInfo | null; rawJson: unknown }
  | { ok: false; status: number; body: string }
> {
  const res = await apiFetch("/work/project/getProjects", {
    sessionToken,
    mode,
    query: { page: "1", limit: "50" },
  });
  if (!res.ok) return { ok: false, status: res.status, body: res.text.slice(0, 500) };
  if (res.json?.code != null && Number(res.json.code) !== 1) {
    return { ok: false, status: res.status, body: res.text.slice(0, 500) };
  }
  const list = Array.isArray(res.json?.data) ? res.json.data : [];
  const match = list.find((p: any) => String(p.printer_id) === String(printerId));
  if (!match) return { ok: true, project: null, rawJson: res.json };
  return {
    ok: true,
    project: {
      progressPercent: numOrNull(match.progress),
      remainingMinutes: numOrNull(match.remain_time),
      elapsedMinutes: numOrNull(match.print_time),
      layerNum: numOrNull(match.settings?.curr_layer),
      totalLayerNum: numOrNull(match.settings?.total_layers),
      fileName: typeof match.gcode_name === "string" ? match.gcode_name : null,
      printStatus: numOrNull(match.print_status),
    },
    rawJson: res.json,
  };
}

/** Senha da conexão MQTT: o slicer access token, criptografado com RSA (PKCS#1 v1.5) usando
 * a chave pública do certificado CA da Anycubic, depois em base64 — confirmado no projeto
 * open-source de referência (fica junto do cert "AnycubicSlicer" usado no mTLS). */
function anycubicMqttToken(slicerAccessToken: string): string {
  const encrypted = crypto.publicEncrypt(
    { key: ANYCUBIC_MQTT_CA_PUBLIC_KEY, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(slicerAccessToken, "utf8"),
  );
  return encrypted.toString("base64");
}

export type AnycubicMqttCredentials = { username: string; password: string; clientId: string };

/** username = "user|pcf|<email>|<md5(clientIdMd5+mqttToken+clientIdMd5)>", password =
 * mqttToken (RSA+base64 acima), clientId = md5(email+"pcf") — confirmado no projeto de
 * referência (get_mqtt_login_info/get_mqtt_client_id). */
export function anycubicMqttCredentials(email: string, slicerAccessToken: string): AnycubicMqttCredentials {
  const clientId = md5Hex(`${email}pcf`);
  const mqttToken = anycubicMqttToken(slicerAccessToken);
  const sigMd5 = md5Hex(`${clientId}${mqttToken}${clientId}`);
  const username = `user|${MQTT_APP_ID}|${email}|${sigMd5}`;
  return { username, password: mqttToken, clientId };
}

export const ANYCUBIC_MQTT_HOST = "mqtt-universe.anycubic.com";
export const ANYCUBIC_MQTT_PORT = 8883;
export const ANYCUBIC_MQTT_TOPIC_PREFIX = "anycubic/anycubicCloud/v1";
