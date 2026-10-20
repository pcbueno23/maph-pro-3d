/**
 * Critério de "está imprimindo de verdade" compartilhado entre o Painel de Farm
 * (app/farm/page.tsx) e qualquer outro lugar que precise do mesmo número (ex.: dashboard) —
 * centralizado aqui pra não duplicar e divergir.
 */
import type { BambuDeviceUI } from "@/hooks/useBambuFarm";
import type { AnycubicDeviceUI } from "@/hooks/useAnycubicFarm";

/** FINISH/FAILED/IDLE = já não tá imprimindo mais, mesmo com progresso/camada ainda
 * presentes no último report da Bambu. */
export const BAMBU_TERMINAL_STATUSES = new Set(["FINISH", "FAILED", "IDLE"]);

export function isBambuActivelyPrinting(d: BambuDeviceUI): boolean {
  if (!d.online) return false;
  if (d.progressPercent != null) {
    const raw = (d.printStatus ?? "").toUpperCase();
    return !BAMBU_TERMINAL_STATUSES.has(raw);
  }
  // Sem dado rico ainda (MQTT não confirmou nesse ciclo) — confia no REST básico, que já
  // diz "RUNNING" com confiança.
  return d.restPrintStatus === "RUNNING";
}

export function isAnycubicActivelyPrinting(d: AnycubicDeviceUI): boolean {
  return d.online && d.printing === true;
}
