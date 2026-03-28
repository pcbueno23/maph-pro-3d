"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAffiliateMe } from "@/hooks/useAffiliateMe";
import type { AffiliateConversion, AffiliatePayout, AffiliateStats } from "@/lib/affiliates";

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:    { label: "Pendente",    cls: "bg-yellow-900/60 text-yellow-300" },
    approved:   { label: "Aprovado",    cls: "bg-cyan-900/60 text-cyan-300" },
    paid:       { label: "Pago",        cls: "bg-emerald-900/60 text-emerald-300" },
    rejected:   { label: "Rejeitado",   cls: "bg-red-900/60 text-red-300" },
    processing: { label: "Processando", cls: "bg-blue-900/60 text-blue-300" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-slate-800 text-slate-300" };
  return <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

type FullData = {
  conversions: AffiliateConversion[];
  payouts: AffiliatePayout[];
  stats: AffiliateStats;
};

export default function AfiliadosPage() {
  const affiliateState = useAffiliateMe();
  const [data, setData] = useState<FullData | null>(null);
  const [loading, setLoading] = useState(true);
  const [payoutInput, setPayoutInput] = useState("");
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (affiliateState.status === "none") { setLoading(false); return; }
    if (affiliateState.status === "loading") return;

    void (async () => {
      if (!supabase) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      setLoading(true);
      try {
        const res = await fetch("/api/affiliates/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = (await res.json()) as FullData & { affiliate?: unknown };
        setData({ conversions: json.conversions ?? [], payouts: json.payouts ?? [], stats: json.stats });
      } finally {
        setLoading(false);
      }
    })();
  }, [affiliateState.status]);

  async function requestPayout() {
    if (!supabase) return;
    const cents = Math.round(parseFloat(payoutInput) * 100);
    if (!cents || cents < 5000) {
      setPayoutMsg({ type: "err", text: "Valor mínimo: R$ 50,00." });
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;

    setPayoutLoading(true);
    setPayoutMsg(null);
    try {
      const res = await fetch("/api/affiliates/me", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount_cents: cents }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setPayoutMsg({ type: "err", text: json.error ?? "Erro ao solicitar." });
        return;
      }
      setPayoutMsg({ type: "ok", text: "Saque solicitado! O admin processará em breve via PIX." });
      setPayoutInput("");
      // Recarrega dados
      const r2 = await fetch("/api/affiliates/me", { headers: { Authorization: `Bearer ${token}` } });
      const d2 = (await r2.json()) as FullData & { affiliate?: unknown };
      if (r2.ok) setData({ conversions: d2.conversions ?? [], payouts: d2.payouts ?? [], stats: d2.stats });
    } finally {
      setPayoutLoading(false);
    }
  }

  function copyLink(link: string) {
    void navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (affiliateState.status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-slate-400">Carregando…</p>
      </div>
    );
  }

  if (affiliateState.status === "none") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-slate-400">Você não está cadastrado como afiliado.</p>
        <p className="mt-1 text-xs text-slate-600">Entre em contato com o administrador.</p>
      </div>
    );
  }

  const { affiliate } = affiliateState;
  const stats = data?.stats;
  const conversions = data?.conversions ?? [];
  const payouts = data?.payouts ?? [];
  const refLink = typeof window !== "undefined"
    ? `${window.location.origin}?ref=${affiliate.code}`
    : `https://app.maphpro3d.com?ref=${affiliate.code}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-slate-50">Programa de Afiliados</h1>
        <p className="mt-0.5 text-sm text-slate-400">
          Indique clientes e ganhe comissão de{" "}
          <span className="font-medium text-cyan-300">{(affiliate.commission_rate * 100).toFixed(0)}%</span>{" "}
          por cada assinatura.
        </p>
      </div>

      {/* Link de indicação */}
      <div className="rounded-2xl border border-cyan-900/40 bg-cyan-950/20 p-5">
        <p className="mb-1 text-xs font-medium uppercase tracking-widest text-cyan-500">Seu link de indicação</p>
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 truncate rounded-xl bg-slate-800 px-3 py-2.5 text-sm text-cyan-300">
            {refLink}
          </code>
          <button
            onClick={() => copyLink(refLink)}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              copied
                ? "bg-emerald-700 text-white"
                : "bg-cyan-600 text-white hover:bg-cyan-500"
            }`}
          >
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Compartilhe esse link. Quando alguém assinar usando ele, você ganha automaticamente.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Conversões",  val: String(conversions.length), color: "text-slate-100" },
            { label: "Pendente",    val: brl(stats.pendingCommissionCents),  color: "text-yellow-300" },
            { label: "Aprovado",    val: brl(stats.approvedCommissionCents), color: "text-cyan-300" },
            { label: "Recebido",    val: brl(stats.paidOutCents),            color: "text-emerald-300" },
          ].map(({ label, val, color }) => (
            <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center">
              <p className="text-xs text-slate-500">{label}</p>
              <p className={`mt-1 text-xl font-bold ${color}`}>{val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Progresso para saque / Solicitar saque */}
      {stats && (() => {
        const MIN_PAYOUT = 5000; // R$ 50,00 em centavos
        const approved = stats.approvedCommissionCents;
        const pending = stats.pendingCommissionCents;
        const total = approved + pending;
        const pctApproved = Math.min(100, Math.round((approved / MIN_PAYOUT) * 100));
        const pctPending = Math.min(100 - pctApproved, Math.round((pending / MIN_PAYOUT) * 100));
        const pctTotal = Math.min(100, Math.round((total / MIN_PAYOUT) * 100));
        const falta = Math.max(0, MIN_PAYOUT - total);
        const canWithdraw = approved >= MIN_PAYOUT;

        return (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200">Saque mínimo: R$ 50,00</h2>
              <div className="text-right">
                {approved > 0 && (
                  <span className="text-sm font-bold text-emerald-400">{brl(approved)} aprovado</span>
                )}
                {pending > 0 && (
                  <span className={`text-sm font-bold text-yellow-300 ${approved > 0 ? " ml-2" : ""}`}>
                    {brl(pending)} pendente
                  </span>
                )}
                {approved === 0 && pending === 0 && (
                  <span className="text-sm font-bold text-slate-400">{brl(0)}</span>
                )}
              </div>
            </div>

            {/* Barra de progresso segmentada */}
            <div className="mb-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-800 flex">
              {canWithdraw ? (
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: "100%" }} />
              ) : (
                <>
                  <div className="h-full bg-cyan-500 transition-all duration-500" style={{ width: `${pctApproved}%` }} />
                  <div className="h-full bg-yellow-500/70 transition-all duration-500" style={{ width: `${pctPending}%` }} />
                </>
              )}
            </div>
            <div className="mb-4 flex justify-between text-xs text-slate-500">
              <span>{pctTotal}% do mínimo</span>
              {!canWithdraw && falta > 0 && (
                <span>Faltam <span className="text-cyan-400 font-medium">{brl(falta)}</span></span>
              )}
              {canWithdraw && (
                <span className="text-emerald-400 font-medium">Disponível para saque!</span>
              )}
            </div>

            {!canWithdraw && (
              <p className="text-xs text-slate-500">
                {pending > 0 && (
                  <><span className="text-yellow-400 font-medium">{brl(pending)}</span> aguardando aprovação do admin. </>
                )}
                Continue indicando para acumular saldo. A cada nova assinatura aprovada, seu saldo aumenta.
                {affiliate.pix_key && (
                  <> Quando atingir R$ 50,00, o pagamento será feito via PIX para <span className="text-slate-300">{affiliate.pix_key}</span>.</>
                )}
              </p>
            )}

            {canWithdraw && (
              <>
                <p className="mb-3 text-xs text-slate-500">
                  Saldo aprovado disponível:{" "}
                  <span className="font-medium text-emerald-300">{brl(approved)}</span>.
                  {affiliate.pix_key && (
                    <> Pagamento via PIX para <span className="text-slate-300">{affiliate.pix_key}</span>.</>
                  )}
                </p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="50"
                    max={approved / 100}
                    step="0.01"
                    placeholder="50.00"
                    value={payoutInput}
                    onChange={(e) => setPayoutInput(e.target.value)}
                    className="flex-1 rounded-xl bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-cyan-500 border border-slate-700"
                  />
                  <button
                    disabled={payoutLoading || !payoutInput}
                    onClick={() => { void requestPayout(); }}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50">
                    {payoutLoading ? "…" : "Solicitar PIX"}
                  </button>
                </div>
                {payoutMsg && (
                  <p className={`mt-2 text-xs ${payoutMsg.type === "ok" ? "text-emerald-400" : "text-red-400"}`}>
                    {payoutMsg.text}
                  </p>
                )}
              </>
            )}
          </div>
        );
      })()}

      {/* Conversões */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-200">Suas conversões</h2>
        {conversions.length === 0 ? (
          <p className="text-xs text-slate-500">
            Nenhuma conversão ainda. Compartilhe seu link acima para começar a ganhar!
          </p>
        ) : (
          <div className="space-y-2">
            {conversions.map((c) => (
              <div key={c.id}
                className="flex items-center justify-between rounded-xl bg-slate-800 px-3 py-2 text-xs">
                <div className="min-w-0">
                  <span className="text-slate-400">{c.referred_user_email}</span>
                  <span className="ml-2 rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300">
                    {c.plan.toUpperCase()}
                  </span>
                  <span className="ml-2 font-semibold text-cyan-300">{brl(c.commission_cents)}</span>
                </div>
                <div className="ml-2 flex shrink-0 items-center gap-1">
                  {statusBadge(c.status)}
                  <span className="text-[10px] text-slate-600">
                    {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Saques */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-200">Histórico de saques</h2>
        {payouts.length === 0 ? (
          <p className="text-xs text-slate-500">Nenhum saque solicitado ainda.</p>
        ) : (
          <div className="space-y-2">
            {payouts.map((p) => (
              <div key={p.id}
                className="flex items-center justify-between rounded-xl bg-slate-800 px-3 py-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-200">{brl(p.amount_cents)}</span>
                  <span className="ml-2 text-slate-500">
                    {new Date(p.created_at).toLocaleDateString("pt-BR")}
                  </span>
                  {p.paid_at && (
                    <span className="ml-1 text-slate-600">
                      · pago em {new Date(p.paid_at).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>
                {statusBadge(p.status)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
