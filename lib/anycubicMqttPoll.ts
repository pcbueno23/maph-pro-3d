import mqtt from "mqtt";
import {
  anycubicMqttCredentials,
  ANYCUBIC_MQTT_HOST,
  ANYCUBIC_MQTT_PORT,
  ANYCUBIC_MQTT_TOPIC_PREFIX,
} from "./anycubicCloud";
import { ANYCUBIC_MQTT_CA_CERT, ANYCUBIC_MQTT_CLIENT_CERT, ANYCUBIC_MQTT_CLIENT_KEY } from "./anycubicCerts";

/**
 * Conexão MQTT "de passagem" — mesmo padrão de bambuMqttPoll.ts. Diferença: usa mTLS (cert
 * de cliente além do usuário/senha) e a Anycubic parece não precisar de pedido explícito tipo
 * "pushall" da Bambu — só espera a próxima mensagem publicada no tópico (pode ser mais lento
 * em impressora ociosa, sem nada "novo" acontecendo pra publicar).
 */

export type AnycubicReport = {
  printing: boolean | null;
  progressPercent: number | null;
  remainingMinutes: number | null;
  elapsedMinutes: number | null;
  layerNum: number | null;
  totalLayerNum: number | null;
  fileName: string | null;
  nozzleTemper: number | null;
  bedTemper: number | null;
  raw: unknown[];
};

export type AnycubicPollDebug = {
  connected: boolean;
  subscribed: boolean;
  messagesReceived: number;
  error: string | null;
  timedOut: boolean;
};

export type AnycubicPollResult = { report: AnycubicReport | null; debug: AnycubicPollDebug };

export async function pollAnycubicDeviceOnce(
  email: string,
  slicerAccessToken: string,
  devId: string,
  machineType: string | null,
  timeoutMs = 8000,
): Promise<AnycubicPollResult> {
  return new Promise((resolve) => {
    let connected = false;
    let subscribed = false;
    let messagesReceived = 0;
    let errorMsg: string | null = null;

    const creds = anycubicMqttCredentials(email, slicerAccessToken);

    const client = mqtt.connect({
      host: ANYCUBIC_MQTT_HOST,
      port: ANYCUBIC_MQTT_PORT,
      protocol: "mqtts",
      username: creds.username,
      password: creds.password,
      clientId: creds.clientId,
      connectTimeout: 6000,
      reconnectPeriod: 0,
      rejectUnauthorized: false,
      cert: ANYCUBIC_MQTT_CLIENT_CERT,
      key: ANYCUBIC_MQTT_CLIENT_KEY,
      ca: ANYCUBIC_MQTT_CA_CERT,
    });

    const collected: Partial<AnycubicReport> = {};
    const rawMessages: unknown[] = [];

    let done = false;
    const finish = (timedOut = false) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      client.end(true);
      const hasAnyField = Object.keys(collected).length > 0 || rawMessages.length > 0;
      resolve({
        report: hasAnyField
          ? {
              printing: collected.printing ?? null,
              progressPercent: collected.progressPercent ?? null,
              remainingMinutes: collected.remainingMinutes ?? null,
              elapsedMinutes: collected.elapsedMinutes ?? null,
              layerNum: collected.layerNum ?? null,
              totalLayerNum: collected.totalLayerNum ?? null,
              fileName: collected.fileName ?? null,
              nozzleTemper: collected.nozzleTemper ?? null,
              bedTemper: collected.bedTemper ?? null,
              raw: rawMessages,
            }
          : null,
        debug: { connected, subscribed, messagesReceived, error: errorMsg, timedOut },
      });
    };

    const timer = setTimeout(() => finish(true), timeoutMs);

    const machine = machineType ?? "+";
    const topics = [
      `${ANYCUBIC_MQTT_TOPIC_PREFIX}/printer/app/${machine}/${devId}/#`,
      `${ANYCUBIC_MQTT_TOPIC_PREFIX}/+/public/${machine}/${devId}/#`,
    ];

    client.on("connect", () => {
      connected = true;
      client.subscribe(topics, (err) => {
        if (err) {
          errorMsg = `falha ao inscrever: ${err.message}`;
          return;
        }
        subscribed = true;
      });
    });

    client.on("message", (_topic, payload) => {
      messagesReceived++;
      try {
        const msg = JSON.parse(payload.toString("utf8"));
        rawMessages.push(msg);

        if (typeof msg.progress === "number" || typeof msg.progress === "string") {
          collected.progressPercent = Number(msg.progress);
        }
        if (msg.remain_time != null) collected.remainingMinutes = Number(msg.remain_time);
        if (msg.print_time != null) collected.elapsedMinutes = Number(msg.print_time);
        if (msg.curr_layer != null) collected.layerNum = Number(msg.curr_layer);
        if (msg.total_layers != null) collected.totalLayerNum = Number(msg.total_layers);
        if (typeof msg.filename === "string") collected.fileName = msg.filename;
        else if (typeof msg.display_filename === "string") collected.fileName = msg.display_filename;
        if (typeof msg.curr_nozzle_temp === "number") collected.nozzleTemper = msg.curr_nozzle_temp;
        if (typeof msg.curr_hotbed_temp === "number") collected.bedTemper = msg.curr_hotbed_temp;
        if (msg.print_status != null) {
          collected.printing = Number(msg.print_status) === 1 || String(msg.print_status).toUpperCase() === "PRINTING";
        }
      } catch {
        // mensagem não-JSON — ignora, só conta como recebida
      }
    });

    client.on("error", (err) => {
      errorMsg = err?.message ?? String(err);
      finish();
    });
  });
}
