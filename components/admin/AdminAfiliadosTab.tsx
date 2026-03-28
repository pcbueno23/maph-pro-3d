"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Affiliate, AffiliateConversion, AffiliatePayout, AffiliateStats } from "@/lib/affiliates";

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pct(rate: number) {
  return `${(rate * 100).toFixed(0)}%`;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: "bg-emerald-900/60 text-emerald-300",
    suspended: "bg-red-900/60 text-red-300",
    pending: "bg-yellow-900/60 text-yellow-300",
    approved: "bg-cyan-900/60 text-cyan-300",
    paid: "bg-emerald-900/60 text-emerald-300",
    rejected: "bg-red-900/60 text-red-300",
    processing: "bg-blue-900/60 text-blue-300",
  };
  const labelMap: Record<string, string> = {
    active: "Ativo", suspended: "Suspenso", pending: "Pendente",
    approved: "Aprovado", paid: "Pago", rejected: "Rejeitado", processing: "Processando",
  };
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${map[status] ?? "bg-slate-800 text-slate-300"}`}>
      {labelMap[status] ?? status}
    </span>
  );
}

async function getToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

// ---------------------------------------------------------------------------
// Modal: criar afiliado
// ---------------------------------------------------------------------------

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (a: Affiliate) => void }) {
  const [form, setForm] = useState({
    name: "", email: "", code: "", commission_rate: "20", pix_key: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const token = await getToken();
    if (!token) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/affiliates", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          code: form.code,
          commission_rate: parseFloat(form.commission_rate) / 100,
          pix_key: form.pix_key || null,
          notes: form.notes || null,
        }),
      });
      const data = (await res.json()) as { affiliate?: Affiliate; error?: string };
      if (!res.ok) { setErr(data.error ?? "Erro ao criar."); return; }
      onCreated(data.affiliate!);
    } catch {
      setErr("Erro de rede.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <h2 className="mb-4 text-base font-semibold text-slate-100">Novo afiliado</h2>
        <form onSubmit={(e) => { void submit(e); }} className="space-y-3">
          {[
            { label: "Nome", key: "name", placeholder: "João Silva", required: true },
            { label: "E-mail", key: "email", placeholder: "joao@email.com", required: true },
            { label: "Código", key: "code", placeholder: "JOAO2024", required: true },
            { label: "Comissão (%)", key: "commission_rate", placeholder: "20", required: true },
            { label: "Chave PIX", key: "pix_key", placeholder: "joao@email.com ou CPF", required: false },
          ].map(({ label, key, placeholder, required }) => (
            <div key={key}>
              <label className="mb-1 block text-xs text-slate-400">{label}{required && " *"}</label>
              <input
                className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-cyan-500 border border-slate-700"
                value={form[key as keyof typeof form]}
                onChange={field(key as keyof typeof form)}
                placeholder={placeholder}
                required={required}
              />
            </div>
          ))}
          <div>
            <label className="mb-1 block text-xs text-slate-400">Observações</label>
            <textarea
              className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-cyan-500 border border-slate-700"
              value={form.notes}
              onChange={field("notes")}
              rows={2}
              placeholder="Notas internas (opcional)"
            />
          </div>
          {err && <p className="text-xs text-red-400">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-slate-700 py-2 text-sm text-slate-400 hover:bg-slate-800">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 rounded-lg bg-cyan-600 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50">
              {saving ? "Salvando…" : "Criar afiliado"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal: detalhes do afiliado
// ---------------------------------------------------------------------------

type DetailData = {
  affiliate: Affiliate;
  conversions: AffiliateConversion[];
  payouts: AffiliatePayout[];
  stats: AffiliateStats;
};

function DetailModal({
  affiliateId,
  onClose,
  onUpdated,
}: {
  affiliateId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [payoutInput, setPayoutInput] = useState("");
  const [origin, setOrigin] = useState("");
  const [editingPix, setEditingPix] = useState(false);
  const [pixInput, setPixInput] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const load = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/affiliates/${affiliateId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json()) as DetailData & { error?: string };
      if (!res.ok) { setErr(json.error ?? "Erro."); return; }
      setData(json);
    } catch {
      setErr("Erro de rede.");
    } finally {
      setLoading(false);
    }
  }, [affiliateId]);

  useEffect(() => { void load(); }, [load]);

  async function patch(body: Record<string, unknown>) {
    const token = await getToken();
    if (!token) return;
    const id = savingId;
    setSavingId(id ?? "saving");
    try {
      await fetch(`/api/admin/affiliates/${affiliateId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await load();
      onUpdated();
    } finally {
      setSavingId(null);
    }
  }

  async function toggleStatus() {
    if (!data) return;
    await patch({ status: data.affiliate.status === "active" ? "suspended" : "active" });
  }

  async function conversionAction(convId: string, status: "approved" | "rejected") {
    setSavingId(convId);
    await patch({ action: "conversion_status", conversion_id: convId, status });
  }

  async function payoutAction(payoutId: string, status: "processing" | "paid" | "rejected") {
    setSavingId(payoutId);
    await patch({ action: "payout_status", payout_id: payoutId, status });
  }

  async function createPayout() {
    const cents = Math.round(parseFloat(payoutInput) * 100);
    if (!cents || cents <= 0) return;
    setSavingId("payout");
    await patch({ action: "create_payout", amount_cents: cents });
    setPayoutInput("");
  }

  async function savePix() {
    setSavingId("pix");
    await patch({ pix_key: pixInput.trim() || null });
    setEditingPix(false);
    setSavingId(null);
  }

  function startEditPix() {
    setPixInput(data?.affiliate.pix_key ?? "");
    setEditingPix(true);
  }

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="rounded-2xl bg-slate-900 p-6 text-sm text-slate-300">Carregando…</div>
    </div>
  );

  if (err || !data) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="rounded-2xl bg-slate-900 p-6 text-sm text-red-400">
        {err ?? "Dados não encontrados."}
        <button onClick={onClose} className="ml-4 text-slate-400 underline">Fechar</button>
      </div>
    </div>
  );

  const { affiliate, conversions, payouts, stats } = data;
  const refLink = `${origin}?ref=${affiliate.code}`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-8">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl mb-8">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100">{affiliate.name}</h2>
            <p className="text-xs text-slate-400">{affiliate.email}</p>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge(affiliate.status)}
            <button onClick={() => { void toggleStatus(); }}
              className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-400 hover:bg-slate-800">
              {affiliate.status === "active" ? "Suspender" : "Ativar"}
            </button>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-lg leading-none">✕</button>
          </div>
        </div>

        {/* Info rápida */}
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Código", val: affiliate.code },
            { label: "Comissão", val: pct(affiliate.commission_rate) },
            { label: "Conversões", val: String(stats.totalConversions) },
          ].map(({ label, val }) => (
            <div key={label} className="rounded-xl bg-slate-800 p-3">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-0.5 text-sm font-medium text-slate-100">{val}</p>
            </div>
          ))}
          {/* Chave PIX editável */}
          <div className="rounded-xl bg-slate-800 p-3">
            <p className="mb-1 text-xs text-slate-500">Chave PIX</p>
            {editingPix ? (
              <div className="flex gap-1">
                <input
                  autoFocus
                  value={pixInput}
                  onChange={(e) => setPixInput(e.target.value)}
                  placeholder="CPF, e-mail ou chave"
                  className="min-w-0 flex-1 rounded bg-slate-700 px-2 py-1 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <button
                  disabled={savingId === "pix"}
                  onClick={() => { void savePix(); }}
                  className="rounded bg-cyan-700 px-2 py-1 text-[10px] text-white hover:bg-cyan-600 disabled:opacity-50">
                  {savingId === "pix" ? "…" : "OK"}
                </button>
                <button
                  onClick={() => setEditingPix(false)}
                  className="rounded bg-slate-700 px-2 py-1 text-[10px] text-slate-400 hover:bg-slate-600">
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <p className="flex-1 truncate text-sm font-medium text-slate-100">
                  {affiliate.pix_key ?? <span className="text-slate-500">—</span>}
                </p>
                <button
                  onClick={startEditPix}
                  className="shrink-0 rounded bg-slate-700 px-2 py-0.5 text-[10px] text-slate-400 hover:bg-slate-600">
                  Editar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats financeiros */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          {[
            { label: "Pendente", val: brl(stats.pendingCommissionCents), color: "text-yellow-300" },
            { label: "Aprovado", val: brl(stats.approvedCommissionCents), color: "text-cyan-300" },
            { label: "Pago", val: brl(stats.paidOutCents), color: "text-emerald-300" },
          ].map(({ label, val, color }) => (
            <div key={label} className="rounded-xl bg-slate-800 p-3 text-center">
              <p className="text-xs text-slate-500">{label}</p>
              <p className={`mt-0.5 text-sm font-semibold ${color}`}>{val}</p>
            </div>
          ))}
        </div>

        {/* Link de afiliado */}
        <div className="mb-4 rounded-xl bg-slate-800 p-3">
          <p className="mb-1 text-xs text-slate-500">Link do afiliado</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate text-xs text-cyan-300">{refLink}</code>
            <button onClick={() => void navigator.clipboard.writeText(refLink)}
              className="rounded-lg bg-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-600">
              Copiar
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Portal do afiliado:{" "}
            <a href={`/afiliados/${affiliate.code}`} target="_blank" rel="noopener noreferrer"
              className="text-cyan-400 underline">
              /afiliados/{affiliate.code}
            </a>
          </p>
        </div>

        {/* Conversões */}
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-medium text-slate-300">Conversões</h3>
          {conversions.length === 0 ? (
            <p className="text-xs text-slate-500">Nenhuma conversão ainda.</p>
          ) : (
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {conversions.map((c) => (
                <div key={c.id}
                  className="flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2 text-xs">
                  <div className="min-w-0">
                    <span className="text-slate-300">{c.referred_user_email}</span>
                    <span className="ml-2 text-slate-500">{c.plan.toUpperCase()}</span>
                    <span className="ml-2 font-medium text-cyan-300">{brl(c.commission_cents)}</span>
                  </div>
                  <div className="ml-2 flex shrink-0 items-center gap-1">
                    {statusBadge(c.status)}
                    {c.status === "pending" && (
                      <>
                        <button disabled={savingId === c.id}
                          onClick={() => { void conversionAction(c.id, "approved"); }}
                          className="rounded bg-cyan-700 px-2 py-0.5 text-[10px] text-white hover:bg-cyan-600 disabled:opacity-50">
                          Aprovar
                        </button>
                        <button disabled={savingId === c.id}
                          onClick={() => { void conversionAction(c.id, "rejected"); }}
                          className="rounded bg-red-900 px-2 py-0.5 text-[10px] text-white hover:bg-red-800 disabled:opacity-50">
                          Rejeitar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Saques */}
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-medium text-slate-300">Saques</h3>
          {payouts.length === 0 ? (
            <p className="text-xs text-slate-500">Nenhum saque ainda.</p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {payouts.map((p) => (
                <div key={p.id}
                  className="flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2 text-xs">
                  <span className="font-medium text-slate-200">{brl(p.amount_cents)}</span>
                  <div className="flex items-center gap-1">
                    {statusBadge(p.status)}
                    {p.status === "pending" && (
                      <>
                        <button disabled={savingId === p.id}
                          onClick={() => { void payoutAction(p.id, "processing"); }}
                          className="rounded bg-blue-800 px-2 py-0.5 text-[10px] text-white hover:bg-blue-700 disabled:opacity-50">
                          Processar
                        </button>
                        <button disabled={savingId === p.id}
                          onClick={() => { void payoutAction(p.id, "rejected"); }}
                          className="rounded bg-red-900 px-2 py-0.5 text-[10px] text-white hover:bg-red-800 disabled:opacity-50">
                          Rejeitar
                        </button>
                      </>
                    )}
                    {p.status === "processing" && (
                      <button disabled={savingId === p.id}
                        onClick={() => { void payoutAction(p.id, "paid"); }}
                        className="rounded bg-emerald-800 px-2 py-0.5 text-[10px] text-white hover:bg-emerald-700 disabled:opacity-50">
                        Marcar como pago
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Criar saque manual */}
        <div className="rounded-xl bg-slate-800 p-3">
          <p className="mb-2 text-xs text-slate-400">Registrar saque manual (R$)</p>
          <div className="flex gap-2">
            <input
              type="number"
              min="50"
              step="0.01"
              placeholder="50.00"
              value={payoutInput}
              onChange={(e) => setPayoutInput(e.target.value)}
              className="flex-1 rounded-lg bg-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <button
              disabled={savingId === "payout" || !payoutInput}
              onClick={() => { void createPayout(); }}
              className="rounded-lg bg-cyan-700 px-4 py-2 text-sm text-white hover:bg-cyan-600 disabled:opacity-50">
              {savingId === "payout" ? "…" : "Registrar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab principal
// ---------------------------------------------------------------------------

export function AdminAfiliadosTab() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/affiliates", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { affiliates?: Affiliate[]; error?: string };
      if (!res.ok) { setErr(data.error ?? "Erro."); return; }
      setAffiliates(data.affiliates ?? []);
    } catch {
      setErr("Erro de rede.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Afiliados</h2>
          <p className="text-xs text-slate-500">Somente você libera novos afiliados.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500">
          + Novo afiliado
        </button>
      </div>

      {loading && <p className="text-sm text-slate-400">Carregando…</p>}
      {err && <p className="text-sm text-red-400">{err}</p>}

      {!loading && affiliates.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center">
          <p className="text-sm text-slate-500">Nenhum afiliado cadastrado.</p>
          <p className="mt-1 text-xs text-slate-600">Clique em "Novo afiliado" para começar.</p>
        </div>
      )}

      {affiliates.length > 0 && (
        <div className="rounded-2xl border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60">
                {["Nome", "Código", "Comissão", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {affiliates.map((a) => (
                <tr key={a.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-200">{a.name}</p>
                    <p className="text-xs text-slate-500">{a.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-slate-800 px-2 py-0.5 text-xs text-cyan-300">{a.code}</code>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{pct(a.commission_rate)}</td>
                  <td className="px-4 py-3">{statusBadge(a.status)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDetailId(a.id)}
                      className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-400 hover:bg-slate-800">
                      Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={(a) => {
            setAffiliates((prev) => [a, ...prev]);
            setShowCreate(false);
          }}
        />
      )}

      {detailId && (
        <DetailModal
          affiliateId={detailId}
          onClose={() => setDetailId(null)}
          onUpdated={() => { void load(); }}
        />
      )}
    </div>
  );
}
