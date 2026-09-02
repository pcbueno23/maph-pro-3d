"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ShopeeConnection = {
  shop_name: string | null;
  shop_id: number;
  connected_at: string;
  last_synced_at: string | null;
  last_order_time: number | null;
};

async function getAuthToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export function ShopeeIntegration() {
  const searchParams = useSearchParams();
  const [connection, setConnection] = useState<ShopeeConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [callbackMsg, setCallbackMsg] = useState<string | null>(null);

  async function refreshStatus() {
    const token = await getAuthToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/shopee/status", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setConnection(data?.connection ?? null);
    } catch {
      setError("Não consegui verificar a conexão com a Shopee.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshStatus();
    const shopee = searchParams.get("shopee");
    if (shopee === "ok") setCallbackMsg("Loja Shopee conectada com sucesso!");
    else if (shopee === "erro") {
      setCallbackMsg(
        `Não consegui conectar com a Shopee${
          searchParams.get("shopee_msg") ? `: ${searchParams.get("shopee_msg")}` : "."
        }`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConnect() {
    const token = await getAuthToken();
    if (!token) return;
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/shopee/oauth/start", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        setError(data?.error ?? "Falha ao iniciar a conexão com a Shopee.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Falha ao iniciar a conexão com a Shopee.");
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    const token = await getAuthToken();
    if (!token) return;
    await fetch("/api/shopee/disconnect", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    setConnection(null);
  }

  async function handleSync() {
    const token = await getAuthToken();
    if (!token) return;
    setSyncing(true);
    setError(null);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/shopee/sync", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Falha ao sincronizar vendas.");
        return;
      }
      setSyncMsg(
        `${data.ordersFound} pedido(s) encontrado(s) · ${data.salesImported} venda(s) nova(s) importada(s)` +
          (data.unmatched > 0 ? ` (${data.unmatched} sem produto correspondente por SKU)` : ""),
      );
      refreshStatus();
    } catch {
      setError("Falha ao sincronizar vendas.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Shopee</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Conecte sua loja pra importar vendas automaticamente (sandbox — só a sua própria loja por enquanto).
          </p>
        </div>
        <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">Shopee</span>
      </div>

      {callbackMsg && (
        <p className="mt-3 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-slate-300">
          {callbackMsg}
        </p>
      )}

      {loading ? (
        <p className="mt-3 text-xs text-slate-500">Verificando conexão...</p>
      ) : connection ? (
        <div className="mt-3 space-y-2">
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            Conectado à loja <strong>{connection.shop_name ?? connection.shop_id}</strong>
          </div>
          <p className="text-[11px] text-slate-500">
            Última sincronização:{" "}
            {connection.last_synced_at
              ? new Date(connection.last_synced_at).toLocaleString("pt-BR")
              : "ainda não sincronizou"}
          </p>
          {syncMsg && <p className="text-xs text-emerald-400">{syncMsg}</p>}
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50"
            >
              {syncing ? "Sincronizando..." : "Sincronizar vendas agora"}
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-900/50"
            >
              Desconectar
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          {error && <p className="mb-2 text-xs text-rose-400">{error}</p>}
          <button
            type="button"
            onClick={handleConnect}
            disabled={connecting}
            className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-400 disabled:opacity-50"
          >
            {connecting ? "Abrindo..." : "Conectar Shopee"}
          </button>
        </div>
      )}
    </div>
  );
}
