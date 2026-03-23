"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function AdminHealthTab() {
  const [loading, setLoading] = useState(true);
  const [checks, setChecks] = useState<
    Record<string, { ok: boolean; detail?: string }>
  >({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!supabase) return;
      setLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) return;
        const res = await fetch("/api/admin/health", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json()) as {
          checks?: typeof checks;
        };
        if (cancelled) return;
        if (res.ok && data.checks) setChecks(data.checks);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-500">Verificando…</p>;
  }

  return (
    <ul className="space-y-2 text-sm">
      {Object.entries(checks).map(([k, v]) => (
        <li
          key={k}
          className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2"
        >
          <span className="font-medium capitalize text-slate-300">{k}</span>
          <span
            className={
              v.ok ? "text-emerald-400" : "text-amber-300"
            }
          >
            {v.ok ? "OK" : "Falha"}
            {v.detail ? (
              <span className="ml-2 text-xs text-slate-500">{v.detail}</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
