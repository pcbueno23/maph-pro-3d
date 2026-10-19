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
const DEVICE_TYPE = "pcf"; // modo "slicer" — só esse modo dá acesso ao MQTT ao vivo
const MQTT_APP_ID = "pcf";
const AUTH_CN = "1";

function md5Hex(input: string): string {
  return crypto.createHash("md5").update(input, "utf8").digest("hex");
}

function signedHeaders(sessionToken?: string): Record<string, string> {
  // Nonce só precisa parecer um identificador único — o servidor não parece validar a
  // estrutura temporal do UUID v1 usado pelo projeto original, só usa como string opaca.
  const nonce = crypto.randomUUID();
  const timestamp = Date.now().toString();
  const sigInput = `${APP_ID}${timestamp}${APP_VERSION_SLICER}${APP_SECRET}${nonce}${APP_ID}`;
  const signature = md5Hex(sigInput);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Xx-Device-Type": DEVICE_TYPE,
    "Xx-Is-Cn": AUTH_CN,
    "Xx-Nonce": nonce,
    "Xx-Signature": signature,
    "Xx-Timestamp": timestamp,
    "Xx-Version": APP_VERSION_SLICER,
    "XX-LANGUAGE": "US",
  };
  if (sessionToken) headers["XX-Token"] = sessionToken;
  return headers;
}

async function apiFetch(
  path: string,
  opts: { method?: string; body?: unknown; sessionToken?: string; query?: Record<string, string> } = {},
) {
  const { method = "GET", body, sessionToken, query } = opts;
  let url = `${BASE_URL}${path}`;
  if (query) {
    const qs = new URLSearchParams(query).toString();
    if (qs) url += `?${qs}`;
  }
  const res = await fetch(url, {
    method,
    headers: signedHeaders(sessionToken),
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
  | { ok: false; status: number; body: string };

/** Troca o access_token extraído do Anycubic Slicer Next por um token de sessão (XX-Token),
 * usado nas chamadas REST seguintes. */
export async function anycubicLoginWithSlicerToken(slicerAccessToken: string): Promise<AnycubicLoginResult> {
  const res = await apiFetch("/v3/public/loginWithAccessToken", {
    method: "POST",
    body: { device_type: DEVICE_TYPE, access_token: slicerAccessToken },
  });
  if (!res.ok) return { ok: false, status: res.status, body: res.text.slice(0, 500) };
  const token = res.json?.data?.token;
  if (!token) return { ok: false, status: 200, body: res.text.slice(0, 500) };
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
): Promise<{ ok: true; devices: AnycubicDevice[]; rawJson: unknown } | { ok: false; status: number; body: string }> {
  const res = await apiFetch("/work/printer/getPrinters", { sessionToken });
  if (!res.ok) return { ok: false, status: res.status, body: res.text.slice(0, 500) };
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
