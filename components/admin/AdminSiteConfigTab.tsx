"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { SiteConfigData } from "@/lib/siteConfig";
import { PLAN_PRICING } from "@/lib/planPricing";

export function AdminSiteConfigTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<SiteConfigData | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!supabase) return;
      setLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) return;
        const res = await fetch("/api/admin/site-config", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = (await res.json()) as { data?: SiteConfigData; error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setErr(j.error ?? "Erro ao carregar.");
          return;
        }
        setData(j.data ?? null);
      } catch {
        if (!cancelled) setErr("Erro de rede.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    if (!supabase || !data) return;
    setSaving(true);
    setErr(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const res = await fetch("/api/admin/site-config", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data }),
      });
      const j = (await res.json()) as { error?: string; data?: SiteConfigData };
      if (!res.ok) {
        setErr(j.error ?? "Falha ao salvar.");
        return;
      }
      if (j.data) setData(j.data);
    } catch {
      setErr("Erro de rede.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !data) {
    return (
      <p className="text-sm text-slate-500">
        {loading ? "Carregando…" : "Sem dados."}
      </p>
    );
  }

  const paywallOn = Boolean(data.paywall_enabled);

  return (
    <div className="max-w-xl space-y-4 text-sm">
      {err ? (
        <p className="text-xs text-amber-200">{err}</p>
      ) : null}

      <section className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-500/10 to-slate-950/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-50">Modo pago (cobrança)</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Liga ou desliga trial, bloqueio após o prazo e a página{" "}
              <strong className="text-slate-300">Assinaturas</strong> no menu. Não precisa
              alterar variáveis na Vercel — vale após salvar (usuários podem precisar
              atualizar a página).
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
              paywallOn
                ? "border border-amber-500/40 bg-amber-500/15 text-amber-200"
                : "border border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
            }`}
          >
            {paywallOn ? "Pago ativo" : "Grátis"}
          </span>
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-950/60 px-3 py-3">
          <input
            type="checkbox"
            checked={paywallOn}
            onChange={(e) =>
              setData((d) =>
                d ? { ...d, paywall_enabled: e.target.checked } : d,
              )
            }
            className="h-4 w-4 rounded border-slate-600"
          />
          <span className="text-slate-200">
            Ativar modo pago (trial + assinatura Stripe/AbacatePay)
          </span>
        </label>
        <ul className="mt-3 space-y-1 text-[11px] text-slate-500">
          <li>
            <strong className="text-slate-400">Desligado:</strong> acesso completo grátis;
            menu Assinaturas oculto.
          </li>
          <li>
            <strong className="text-slate-400">Ligado:</strong>{" "}
            <code className="text-cyan-400/90">APP_TRIAL_DAYS</code> de teste e depois
            cobrança até assinar.
          </li>
        </ul>
      </section>

      <label className="block">
        <span className="text-xs text-slate-500">WhatsApp (URL)</span>
        <input
          type="url"
          value={data.support_whatsapp_link ?? ""}
          onChange={(e) =>
            setData((d) =>
              d ? { ...d, support_whatsapp_link: e.target.value } : d,
            )
          }
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs"
          placeholder="https://wa.me/..."
        />
      </label>
      <label className="block">
        <span className="text-xs text-slate-500">Texto do link (opcional)</span>
        <input
          type="text"
          value={data.support_whatsapp_display ?? ""}
          onChange={(e) =>
            setData((d) =>
              d ? { ...d, support_whatsapp_display: e.target.value } : d,
            )
          }
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs"
        />
      </label>
      <label className="block">
        <span className="text-xs text-slate-500">URL dos termos (opcional)</span>
        <input
          type="url"
          value={data.terms_url ?? ""}
          onChange={(e) =>
            setData((d) => (d ? { ...d, terms_url: e.target.value } : d))
          }
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs"
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={Boolean(data.banner_enabled)}
          onChange={(e) =>
            setData((d) =>
              d ? { ...d, banner_enabled: e.target.checked } : d,
            )
          }
        />
        <span className="text-slate-300">Banner de aviso no topo do app</span>
      </label>
      <label className="block">
        <span className="text-xs text-slate-500">Título do banner</span>
        <input
          type="text"
          value={data.banner_title ?? ""}
          onChange={(e) =>
            setData((d) => (d ? { ...d, banner_title: e.target.value } : d))
          }
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs"
        />
      </label>
      <label className="block">
        <span className="text-xs text-slate-500">Mensagem</span>
        <textarea
          value={data.banner_message ?? ""}
          onChange={(e) =>
            setData((d) =>
              d ? { ...d, banner_message: e.target.value } : d,
            )
          }
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs"
        />
      </label>
      <hr className="border-slate-700" />
      <p className="text-xs font-medium text-slate-400">Preços dos planos</p>
      <label className="block">
        <span className="text-xs text-slate-500">
          Plano Pro — preço em centavos (ex.: 2990 = R$&nbsp;29,90)
        </span>
        <input
          type="number"
          min={1}
          step={1}
          value={data.plan_price_pro_cents ?? PLAN_PRICING.pro.priceCents}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            setData((d) =>
              d ? { ...d, plan_price_pro_cents: isNaN(v) ? undefined : v } : d,
            );
          }}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs"
        />
      </label>
      <label className="block">
        <span className="text-xs text-slate-500">
          Plano Anual — preço em centavos (ex.: 19990 = R$&nbsp;199,90)
        </span>
        <input
          type="number"
          min={1}
          step={1}
          value={data.plan_price_business_cents ?? PLAN_PRICING.business.priceCents}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            setData((d) =>
              d
                ? { ...d, plan_price_business_cents: isNaN(v) ? undefined : v }
                : d,
            );
          }}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs"
        />
      </label>
      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
      >
        {saving ? "Salvando…" : "Salvar site"}
      </button>
    </div>
  );
}
