import mqtt from "mqtt";
import { randomUUID } from "crypto";

/**
 * Conexão MQTT "de passagem": abre, pede o snapshot completo (pushall), espera
 * a primeira mensagem com bloco "print" (ou o timeout) e fecha — feito pra
 * rodar dentro de uma function serverless de cron, não uma conexão contínua.
 * Mesma ressalva de sempre: protocolo mapeado por engenharia reversa
 * (Home Assistant bambu_lab, bambu-connect), nunca testado ao vivo por mim.
 */

function mqttHost(region: string): string {
  return region === "china" ? "cn.mqtt.bambulab.com" : "us.mqtt.bambulab.com";
}

export type BambuReport = {
  printStatus: string | null;
  progressPercent: number | null;
  remainingMinutes: number | null;
  nozzleTemper: number | null;
  nozzleTargetTemper: number | null;
  bedTemper: number | null;
  bedTargetTemper: number | null;
  chamberTemper: number | null;
  /** Camada atual/total — layer_num e total_layer_num, bem documentados no ecossistema
   * (Home Assistant bambu_lab, pybambu). Não arrisco decodificar stg_cur (código numérico
   * de "etapa") porque a tabela de códigos varia por firmware e eu não tenho como confirmar
   * contra uma impressora real — melhor mostrar só o que dá pra confiar. */
  layerNum: number | null;
  totalLayerNum: number | null;
  fileName: string | null;
  raw: unknown;
};

export type BambuPollDebug = {
  /** Chegou a autenticar e abrir a conexão MQTT. Se vier false, o problema é
   * credencial/rede/porta bloqueada — não chega nem a pedir o status. */
  connected: boolean;
  /** Inscreveu no tópico de report com sucesso (depois de conectar). */
  subscribed: boolean;
  /** Quantas mensagens chegaram no tópico, não importa o conteúdo. */
  messagesReceived: number;
  /** Quantas dessas mensagens tinham o bloco "print" (dado de impressão de verdade). */
  messagesWithPrint: number;
  /** Mensagem de erro do cliente MQTT, quando teve. */
  error: string | null;
  /** Bateu o timeout sem nunca achar uma mensagem com "print". */
  timedOut: boolean;
};

export type BambuPollResult = {
  report: BambuReport | null;
  debug: BambuPollDebug;
};

export async function pollBambuDeviceOnce(
  region: string,
  uid: string,
  accessToken: string,
  devId: string,
  timeoutMs = 6000,
): Promise<BambuPollResult> {
  return new Promise((resolve) => {
    let connected = false;
    let subscribed = false;
    let messagesReceived = 0;
    let messagesWithPrint = 0;
    let errorMsg: string | null = null;

    const client = mqtt.connect({
      host: mqttHost(region),
      port: 8883,
      protocol: "mqtts",
      username: `u_${uid}`,
      password: accessToken,
      clientId: `mp3d_cron_${randomUUID()}`,
      connectTimeout: 5000,
      reconnectPeriod: 0, // uma tentativa só, essa conexão é descartável
      rejectUnauthorized: false,
    });

    let done = false;
    const finish = (report: BambuReport | null, timedOut = false) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      client.end(true);
      resolve({
        report,
        debug: { connected, subscribed, messagesReceived, messagesWithPrint, error: errorMsg, timedOut },
      });
    };

    const timer = setTimeout(() => finish(null, true), timeoutMs);

    client.on("connect", () => {
      connected = true;
      client.subscribe(`device/${devId}/report`, (err) => {
        if (err) {
          errorMsg = `falha ao inscrever no tópico de report: ${err.message}`;
          return;
        }
        subscribed = true;
        client.publish(
          `device/${devId}/request`,
          JSON.stringify({ pushing: { sequence_id: "0", command: "pushall" } }),
        );
      });
    });

    client.on("message", (_topic, payload) => {
      messagesReceived++;
      try {
        const msg = JSON.parse(payload.toString("utf8"));
        const print = msg?.print;
        if (!print) return; // espera uma mensagem com dado de verdade
        messagesWithPrint++;
        finish({
          printStatus: print.gcode_state ?? null,
          progressPercent: typeof print.mc_percent === "number" ? print.mc_percent : null,
          remainingMinutes: typeof print.mc_remaining_time === "number" ? print.mc_remaining_time : null,
          nozzleTemper: typeof print.nozzle_temper === "number" ? print.nozzle_temper : null,
          nozzleTargetTemper: typeof print.nozzle_target_temper === "number" ? print.nozzle_target_temper : null,
          bedTemper: typeof print.bed_temper === "number" ? print.bed_temper : null,
          bedTargetTemper: typeof print.bed_target_temper === "number" ? print.bed_target_temper : null,
          chamberTemper: typeof print.chamber_temper === "number" ? print.chamber_temper : null,
          layerNum: typeof print.layer_num === "number" ? print.layer_num : null,
          totalLayerNum: typeof print.total_layer_num === "number" ? print.total_layer_num : null,
          fileName: print.subtask_name || print.gcode_file || null,
          raw: msg,
        });
      } catch {
        // mensagem não-JSON — ignora, espera a próxima ou o timeout
      }
    });

    client.on("error", (err) => {
      errorMsg = err?.message ?? String(err);
      finish(null);
    });
  });
}
