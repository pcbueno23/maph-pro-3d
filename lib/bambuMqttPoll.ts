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
  bedTemper: number | null;
  raw: unknown;
};

export async function pollBambuDeviceOnce(
  region: string,
  uid: string,
  accessToken: string,
  devId: string,
  timeoutMs = 6000,
): Promise<BambuReport | null> {
  return new Promise((resolve) => {
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
    const finish = (result: BambuReport | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      client.end(true);
      resolve(result);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    client.on("connect", () => {
      client.subscribe(`device/${devId}/report`, () => {
        client.publish(
          `device/${devId}/request`,
          JSON.stringify({ pushing: { sequence_id: "0", command: "pushall" } }),
        );
      });
    });

    client.on("message", (_topic, payload) => {
      try {
        const msg = JSON.parse(payload.toString("utf8"));
        const print = msg?.print;
        if (!print) return; // espera uma mensagem com dado de verdade
        finish({
          printStatus: print.gcode_state ?? null,
          progressPercent: typeof print.mc_percent === "number" ? print.mc_percent : null,
          remainingMinutes: typeof print.mc_remaining_time === "number" ? print.mc_remaining_time : null,
          nozzleTemper: typeof print.nozzle_temper === "number" ? print.nozzle_temper : null,
          bedTemper: typeof print.bed_temper === "number" ? print.bed_temper : null,
          raw: msg,
        });
      } catch {
        // mensagem não-JSON — ignora, espera a próxima ou o timeout
      }
    });

    client.on("error", () => finish(null));
  });
}
