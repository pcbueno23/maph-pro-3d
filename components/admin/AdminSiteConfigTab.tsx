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

  return (
    <div className="max-w-xl space-y-4 text-sm">
      {err ? (
        <p className="text-xs text-amber-200">{err}</p>
      ) : null}
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
          value={data.plan_price_lifetime_cents ?? PLAN_PRICING.lifetime.priceCents}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            setData((d) =>
              d
                ? { ...d, plan_price_lifetime_cents: isNaN(v) ? undefined : v }
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
