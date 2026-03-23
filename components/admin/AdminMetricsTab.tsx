"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function AdminMetricsTab() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  type Counts = {
    users_total: number;
    users_7d: number;
    users_30d: number;
    banned: number;
  };
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!supabase) return;
      setLoading(true);
      setErr(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) return;
        const res = await fetch("/api/admin/metrics", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json()) as {
          error?: string;
          counts?: Counts;
        };
        if (cancelled) return;
        if (!res.ok) {
          setErr(data.error ?? "Erro ao carregar métricas.");
          return;
        }
        setCounts(data.counts ?? null);
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

  if (loading) {
    return <p className="text-sm text-slate-500">Carregando métricas…</p>;
  }
  if (err) {
    return (
      <p className="text-sm text-amber-200">
        {err} Rode a migration <code className="text-xs">20260327_admin_audit_site_metrics.sql</code> se necessário.
      </p>
    );
  }
  if (!counts) return null;

  const cards = [
    { label: "Total de contas", value: counts.users_total },
    { label: "Novos (7 dias)", value: counts.users_7d },
    { label: "Novos (30 dias)", value: counts.users_30d },
    { label: "Banidos ativos", value: counts.banned },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3"
        >
          <p className="text-xs text-slate-500">{c.label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-100">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
