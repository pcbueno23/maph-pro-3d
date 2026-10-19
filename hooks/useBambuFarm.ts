"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type BambuDeviceUI = {
  devId: string;
  name: string;
  online: boolean;
  model: string | null;
  printStatus?: string | null;
  progressPercent?: number | null;
  remainingMinutes?: number | null;
  nozzleTemper?: number | null;
  nozzleTargetTemper?: number | null;
  bedTemper?: number | null;
  bedTargetTemper?: number | null;
  chamberTemper?: number | null;
  layerNum?: number | null;
  totalLayerNum?: number | null;
  fileName?: string | null;
  statusUpdatedAt?: string | null;
  /** Diagnóstico do poll MQTT desse ciclo (null quando nem tentou, ex.: sem uid salvo —
   * precisa reconectar a conta). Usado pra diferenciar "realmente parada" de "não consegui
   * confirmar o status ao vivo" na tela — ver app/farm/page.tsx. */
  pollDebug?: {
    connected: boolean;
    subscribed: boolean;
    messagesReceived: number;
    messagesWithPrint: number;
    error: string | null;
    timedOut: boolean;
  } | null;
  /** JSON bruto que a Bambu respondeu nesse ciclo (quando o poll recebeu alguma mensagem
   * com dado de impressão) — mostrado num "ver bruto" no card pra depurar nomes de campo. */
  raw?: unknown;
};

/** Toda a lógica de conectar/consultar a conta Bambu Lab — extraída de app/impressoras
 * pra ser reaproveitada também no painel de farm dedicado (app/farm). Poll a cada 15s:
 * a rota /api/bambu/devices já faz o MQTT ao vivo por trás a cada chamada (ver seu
 * comentário), não depende mais só do cron diário. */
export function useBambuFarm(userId: string | undefined, pollMs = 15_000) {
  const [bambuConnected, setBambuConnected] = useState<boolean | null>(null);
  const [bambuDevices, setBambuDevices] = useState<BambuDeviceUI[]>([]);
  /** false = a conta está sem o "uid" salvo (login antigo, antes desse dado existir) —
   * sem ele o poll MQTT ao vivo nem tenta rodar. Reconectar a conta resolve. */
  const [accountHasUid, setAccountHasUid] = useState(true);
  const [bambuLoading, setBambuLoading] = useState(false);
  const [bambuError, setBambuError] = useState<string | null>(null);
  const [bambuEmail, setBambuEmail] = useState("");
  const [bambuPassword, setBambuPassword] = useState("");
  const [bambuNeedsCode, setBambuNeedsCode] = useState(false);
  const [bambuCode, setBambuCode] = useState("");

  async function getAuthToken(): Promise<string | null> {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function refreshBambuDevices() {
    const token = await getAuthToken();
    if (!token) return;
    setBambuLoading(true);
    setBambuError(null);
    try {
      const res = await fetch("/api/bambu/devices", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.status === 404) {
        setBambuConnected(false);
        return;
      }
      if (!res.ok) {
        setBambuError(data.error ?? "Falha ao buscar impressoras Bambu Lab.");
        setBambuConnected(true);
        return;
      }
      setBambuConnected(true);
      setBambuDevices(data.devices ?? []);
      setAccountHasUid(data.accountHasUid !== false);
    } catch {
      setBambuError("Erro de rede ao falar com a Bambu Lab.");
    } finally {
      setBambuLoading(false);
    }
  }

  useEffect(() => {
    if (!userId) return;
    void refreshBambuDevices();
    const interval = window.setInterval(() => void refreshBambuDevices(), pollMs);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function handleBambuLogin() {
    const token = await getAuthToken();
    if (!token || !bambuEmail || !bambuPassword) return;
    setBambuLoading(true);
    setBambuError(null);
    try {
      const res = await fetch("/api/bambu/login", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email: bambuEmail, password: bambuPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBambuError(`${data.error ?? "Falha no login."} ${data.bambuBody ? `(${data.bambuBody})` : ""}`);
        return;
      }
      if (data.needsVerification) {
        setBambuNeedsCode(true);
        setBambuError("A Bambu Lab mandou um código de verificação pro seu e-mail — digita ele abaixo.");
        return;
      }
      setBambuPassword("");
      await refreshBambuDevices();
    } catch {
      setBambuError("Erro de rede ao falar com a Bambu Lab.");
    } finally {
      setBambuLoading(false);
    }
  }

  async function handleBambuVerify() {
    const token = await getAuthToken();
    if (!token || !bambuEmail || !bambuCode) return;
    setBambuLoading(true);
    setBambuError(null);
    try {
      const res = await fetch("/api/bambu/verify", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email: bambuEmail, code: bambuCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBambuError(`${data.error ?? "Código inválido."} ${data.bambuBody ? `(${data.bambuBody})` : ""}`);
        return;
      }
      setBambuNeedsCode(false);
      setBambuCode("");
      await refreshBambuDevices();
    } catch {
      setBambuError("Erro de rede ao falar com a Bambu Lab.");
    } finally {
      setBambuLoading(false);
    }
  }

  async function handleBambuDisconnect() {
    const token = await getAuthToken();
    if (!token) return;
    setBambuLoading(true);
    try {
      await fetch("/api/bambu/disconnect", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setBambuConnected(false);
      setBambuDevices([]);
      setBambuEmail("");
      setBambuNeedsCode(false);
    } finally {
      setBambuLoading(false);
    }
  }

  return {
    bambuConnected,
    bambuDevices,
    accountHasUid,
    bambuLoading,
    bambuError,
    bambuEmail,
    setBambuEmail,
    bambuPassword,
    setBambuPassword,
    bambuNeedsCode,
    bambuCode,
    setBambuCode,
    refreshBambuDevices,
    handleBambuLogin,
    handleBambuVerify,
    handleBambuDisconnect,
  };
}
