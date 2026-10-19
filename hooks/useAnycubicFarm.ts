"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type AnycubicDeviceUI = {
  devId: string;
  name: string;
  model: string | null;
  online: boolean;
  /** Vem do REST (getPrinters) — confiável mesmo sem o MQTT confirmar nada nesse ciclo. */
  restIsPrinting: boolean;
  /** printing: true/false já considera o print_status do projeto (REST, /work/project/getProjects)
   * — funciona em qualquer modo, com ou sem MQTT. null só quando nem isso veio. */
  printing: boolean | null;
  /** print_status cru do projeto (1=Printing, 2=Complete, 3=Cancelled... ver ANYCUBIC_PRINT_STATUS). */
  printStatusRaw: number | null;
  progressPercent: number | null;
  remainingMinutes: number | null;
  elapsedMinutes: number | null;
  layerNum: number | null;
  totalLayerNum: number | null;
  fileName: string | null;
  nozzleTemper: number | null;
  bedTemper: number | null;
  statusUpdatedAt: string | null;
  pollDebug: {
    connected: boolean;
    subscribed: boolean;
    messagesReceived: number;
    error: string | null;
    timedOut: boolean;
  } | null;
  raw: unknown;
};

/** Mesmo padrão de hooks/useBambuFarm.ts — conta Anycubic (Kobra X), login via token
 * extraído do Anycubic Slicer Next (processo manual, fora do SaaS). */
export function useAnycubicFarm(userId: string | undefined, pollMs = 3 * 60_000) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [devices, setDevices] = useState<AnycubicDeviceUI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [slicerAccessToken, setSlicerAccessToken] = useState("");
  const [devicesRawJson, setDevicesRawJson] = useState<unknown>(null);
  /** Preenchido quando o login falha — payload do JWT do token colado + valores usados na
   * assinatura da requisição, pra cruzar com a mensagem de erro da Anycubic. */
  const [loginDebug, setLoginDebug] = useState<{
    jwtPayload: unknown;
    request: { appId: string; appVersion: string; deviceType: string; endpoint: string } | null;
  } | null>(null);

  async function getAuthToken(): Promise<string | null> {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function refreshDevices() {
    const token = await getAuthToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/anycubic/devices", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.status === 404) {
        setConnected(false);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Falha ao buscar impressora Anycubic.");
        setConnected(true);
        return;
      }
      setConnected(true);
      setDevices(data.devices ?? []);
      setDevicesRawJson(data.devicesRawJson ?? null);
    } catch {
      setError("Erro de rede ao falar com a Anycubic.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!userId) return;
    void refreshDevices();
    const interval = window.setInterval(() => void refreshDevices(), pollMs);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function handleLogin() {
    const token = await getAuthToken();
    if (!token || !email || !slicerAccessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/anycubic/login", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email, slicerAccessToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(`${data.error ?? "Falha no login."} ${data.anycubicBody ? `(${data.anycubicBody})` : ""}`);
        setLoginDebug({ jwtPayload: data.debugJwtPayload, request: data.debugRequest ?? null });
        return;
      }
      setLoginDebug(null);
      setSlicerAccessToken("");
      await refreshDevices();
    } catch {
      setError("Erro de rede ao falar com a Anycubic.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    const token = await getAuthToken();
    if (!token) return;
    setLoading(true);
    try {
      await fetch("/api/anycubic/disconnect", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      setConnected(false);
      setDevices([]);
      setEmail("");
    } finally {
      setLoading(false);
    }
  }

  return {
    connected,
    devices,
    loading,
    error,
    email,
    setEmail,
    slicerAccessToken,
    setSlicerAccessToken,
    devicesRawJson,
    loginDebug,
    refreshDevices,
    handleLogin,
    handleDisconnect,
  };
}
