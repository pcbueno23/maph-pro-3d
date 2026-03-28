"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { AffiliateConversion, AffiliatePayout, AffiliateStats } from "@/lib/affiliates";

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function statusLabel(s: string) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:    { label: "Pendente",     cls: "bg-yellow-900/60 text-yellow-300" },
    approved:   { label: "Aprovado",     cls: "bg-cyan-900/60 text-cyan-300" },
    paid:       { label: "Pago",         cls: "bg-emerald-900/60 text-emerald-300" },
    rejected:   { label: "Rejeitado",    cls: "bg-red-900/60 text-red-300" },
    processing: { label: "Processando",  cls: "bg-blue-900/60 text-blue-300" },
  };
  const { label, cls } = map[s] ?? { label: s, cls: "bg-slate-800 text-slate-300" };
  return <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

type AffiliatePublic = {
  id: string;
  name: string;
  code: string;
  commission_rate: number;
  pix_key: string | null;
  created_at: string;
};

type Data = {
  affiliate: AffiliatePublic;
  conversions: AffiliateConversion[];
  payouts: AffiliatePayout[];
  stats: AffiliateStats;
};

export default function AffiliatePage() {
  const params = useParams();
  const code = typeof params.code === "string" ? params.code : "";

  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [payoutInput, setPayoutInput] = useState("");
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!code) return;
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/affiliates/${code}`);
        const json = (await res.json()) as Data & { error?: string };
        if (!res.ok) { setErr(json.error ?? "Afiliado não encontrado."); return; }
        setData(json);
      } catch {
        setErr("Erro de rede.");
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  async function requestPayout() {
    if (!data) return;
    const cents = Math.round(parseFloat(payoutInput) * 100);
    if (!cents || cents < 5000) {
      setPayoutMsg({ type: "err", text: "Valor mínimo: R$ 50,00." });
      return;
    }
    setPayoutLoading(true);
    setPayoutMsg(null);
    try {
      const res = await fetch(`/api/affiliates/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_cents: cents }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setPayoutMsg({ type: "err", text: json.error ?? "Erro ao solicitar." });
        return;
      }
      setPayoutMsg({ type: "ok", text: "Saque solicitado! O admin processará em breve." });
      setPayoutInput("");
      // Recarrega dados
      const r2 = await fetch(`/api/affiliates/${code}`);
      const d2 = (await r2.json()) as Data;
      if (r2.ok) setData(d2);
    } catch {
      setPayoutMsg({ type: "err", text: "Erro de rede." });
    } finally {
      setPayoutLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <p className="text-sm text-slate-400">Carregando…</p>
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center max-w-sm">
          <p className="text-sm text-red-400">{err ?? "Afiliado não encontrado."}</p>
          <p className="mt-2 text-xs text-slate-500">Verifique o link com o administrador.</p>
        </div>
      </div>
    );
  }

  const { affiliate, conversions, payouts, stats } = data;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-cyan-500">Portal do Afiliado</p>
          <h1 className="mt-1 text-xl font-bold text-slate-100">{affiliate.name}</h1>
          <p className="text-sm text-slate-500">
            Código: <code className="text-cyan-300">{affiliate.code}</code>
            {" · "}Comissão: <span className="text-slate-300">{(affiliate.commission_rate * 100).toFixed(0)}%</span>
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Conversões", val: String(stats.totalConversions), color: "text-slate-100" },
            { label: "Pendente", val: brl(stats.pendingCommissionCents), color: "text-yellow-300" },
            { label: "Aprovado", val: brl(stats.approvedCommissionCents), color: "text-cyan-300" },
            { label: "Recebido", val: brl(stats.paidOutCents), color: "text-emerald-300" },
          ].map(({ label, val, color }) => (
            <div key={label} className="rounded-2xl bg-slate-900 border border-slate-800 p-4 text-center">
              <p className="text-xs text-slate-500">{label}</p>
              <p className={`mt-1 text-lg font-bold ${color}`}>{val}</p>
            </div>
          ))}
        </div>

        {/* Solicitar saque */}
        {stats.approvedCommissionCents >= 5000 && (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
            <h2 className="mb-1 text-sm font-semibold text-slate-200">Solicitar saque</h2>
            <p className="mb-3 text-xs text-slate-500">
              Saldo aprovado disponível: <span className="text-cyan-300 font-medium">{brl(stats.approvedCommissionCents)}</span>.
              {affiliate.pix_key && (
                <> PIX cadastrado: <span className="text-slate-300">{affiliate.pix_key}</span>.</>
              )}
            </p>
            <div className="flex gap-2">
              <input
                type="number"
                min="50"
                step="0.01"
                placeholder="50.00"
                value={payoutInput}
                onChange={(e) => setPayoutInput(e.target.value)}
                className="flex-1 rounded-xl bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-cyan-500 border border-slate-700"
              />
              <button
                disabled={payoutLoading || !payoutInput}
                onClick={() => { void requestPayout(); }}
                className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50">
                {payoutLoading ? "…" : "Solicitar"}
              </button>
            </div>
            {payoutMsg && (
              <p className={`mt-2 text-xs ${payoutMsg.type === "ok" ? "text-emerald-400" : "text-red-400"}`}>
                {payoutMsg.text}
              </p>
            )}
          </div>
        )}

        {/* Conversões */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-200">Suas conversões</h2>
          {conversions.length === 0 ? (
            <p className="text-xs text-slate-500">Nenhuma conversão ainda. Compartilhe seu link!</p>
          ) : (
            <div className="space-y-2">
              {conversions.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl bg-slate-800 px-3 py-2 text-xs">
                  <div>
                    <span className="text-slate-400">{c.referred_user_email}</span>
                    <span className="ml-2 rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300">
                      {c.plan.toUpperCase()}
                    </span>
                    <span className="ml-2 font-medium text-cyan-300">{brl(c.commission_cents)}</span>
                  </div>
                  {statusLabel(c.status)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Saques */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-200">Histórico de saques</h2>
          {payouts.length === 0 ? (
            <p className="text-xs text-slate-500">Nenhum saque solicitado ainda.</p>
          ) : (
            <div className="space-y-2">
              {payouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl bg-slate-800 px-3 py-2 text-xs">
                  <div>
                    <span className="font-medium text-slate-200">{brl(p.amount_cents)}</span>
                    <span className="ml-2 text-slate-500">
                      {new Date(p.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  {statusLabel(p.status)}
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-700">
          Maph Pro 3D · Programa de Afiliados
        </p>
      </div>
    </div>
  );
}
