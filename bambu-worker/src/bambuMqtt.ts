import mqtt, { type MqttClient } from "mqtt";
import { randomUUID } from "node:crypto";
import { upsertDeviceStatus } from "./supabase.js";
import type { BambuAccountRow } from "./supabase.js";
import { bambuListDevices } from "./bambuCloud.js";

/**
 * Host/porta/credencial do broker MQTT da nuvem Bambu — nunca testado ao vivo por
 * mim, só mapeado a partir de projetos open-source (Home Assistant bambu_lab,
 * bambu-connect). Se não conectar, o log abaixo mostra o motivo exato pra
 * ajustarmos juntos.
 */
function mqttHost(region: string): string {
  return region === "china" ? "cn.mqtt.bambulab.com" : "us.mqtt.bambulab.com";
}

type Connection = { client: MqttClient; devIds: Set<string> };

const connections = new Map<string, Connection>(); // key: user_id

function parseReport(payload: Buffer): any | null {
  try {
    return JSON.parse(payload.toString("utf8"));
  } catch {
    return null;
  }
}

function handleReportMessage(userId: string, devId: string, msg: any) {
  const print = msg?.print;
  if (!print) {
    // Mensagem sem bloco "print" — grava o bruto mesmo assim, útil pra ver o que veio.
    void upsertDeviceStatus({ userId, devId, raw: msg });
    return;
  }
  void upsertDeviceStatus({
    userId,
    devId,
    online: true,
    printStatus: print.gcode_state ?? null,
    progressPercent: typeof print.mc_percent === "number" ? print.mc_percent : null,
    remainingMinutes: typeof print.mc_remaining_time === "number" ? print.mc_remaining_time : null,
    nozzleTemper: typeof print.nozzle_temper === "number" ? print.nozzle_temper : null,
    bedTemper: typeof print.bed_temper === "number" ? print.bed_temper : null,
    raw: msg,
  });
}

async function connectAccount(account: BambuAccountRow) {
  if (!account.uid) {
    console.warn(
      `[bambuMqtt] conta ${account.email} ainda não tem "uid" salvo (login antigo) — peça pra reconectar em /impressoras.`,
    );
    return;
  }

  const devices = await bambuListDevices(account.region, account.access_token);
  if (devices.length === 0) {
    console.warn(`[bambuMqtt] conta ${account.email}: nenhuma impressora encontrada, não conecta MQTT.`);
    return;
  }

  const host = mqttHost(account.region);
  const client = mqtt.connect({
    host,
    port: 8883,
    protocol: "mqtts",
    username: `u_${account.uid}`,
    password: account.access_token,
    clientId: `mp3d_${randomUUID()}`,
    reconnectPeriod: 10_000,
    rejectUnauthorized: false, // certificado da Bambu costuma ser self-signed no LAN; mantém consistente aqui
  });

  const devIds = new Set(devices.map((d) => d.devId));
  connections.set(account.user_id, { client, devIds });

  client.on("connect", () => {
    console.log(`[bambuMqtt] conectado (${account.email}) em ${host} — ${devices.length} impressora(s).`);
    for (const d of devices) {
      client.subscribe(`device/${d.devId}/report`, (err) => {
        if (err) console.error(`[bambuMqtt] falha ao assinar ${d.devId}:`, err.message);
      });
      // Pede o snapshot completo assim que assina — sem isso só chegam deltas.
      client.publish(
        `device/${d.devId}/request`,
        JSON.stringify({ pushing: { sequence_id: "0", command: "pushall" } }),
      );
      void upsertDeviceStatus({ userId: account.user_id, devId: d.devId, name: d.name, online: d.online });
    }
  });

  client.on("message", (topic, payload) => {
    const match = /^device\/([^/]+)\/report$/.exec(topic);
    if (!match) return;
    const devId = match[1];
    const msg = parseReport(payload);
    if (msg) handleReportMessage(account.user_id, devId, msg);
  });

  client.on("error", (err) => {
    console.error(`[bambuMqtt] erro na conexão de ${account.email}:`, err.message);
  });

  client.on("close", () => {
    console.log(`[bambuMqtt] conexão fechada (${account.email}) — mqtt.js tenta reconectar sozinho.`);
  });
}

export async function syncAccounts(accounts: BambuAccountRow[]) {
  const currentIds = new Set(accounts.map((a) => a.user_id));

  // Desconecta contas que saíram da lista (usuário desconectou pelo SaaS).
  for (const [userId, conn] of connections) {
    if (!currentIds.has(userId)) {
      conn.client.end(true);
      connections.delete(userId);
      console.log(`[bambuMqtt] conta removida — encerrando conexão (${userId}).`);
    }
  }

  // Conecta contas novas.
  for (const account of accounts) {
    if (connections.has(account.user_id)) continue;
    await connectAccount(account);
  }
}

export function activeConnectionCount(): number {
  return connections.size;
}
