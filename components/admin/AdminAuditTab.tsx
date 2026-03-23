"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Entry = {
  id: string;
  admin_email: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: unknown;
  created_at: string;
};

export function AdminAuditTab() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!supabase) return;
      setLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) return;
        const res = await fetch("/api/admin/audit?limit=60", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json()) as {
          error?: string;
          entries?: Entry[];
        };
        if (cancelled) return;
        if (!res.ok) {
          setErr(data.error ?? "Erro.");
          return;
        }
        setEntries(data.entries ?? []);
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
    return <p className="text-sm text-slate-500">Carregando auditoria…</p>;
  }
  if (err) {
    return <p className="text-sm text-amber-200">{err}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full min-w-[640px] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-500">
            <th className="px-2 py-2">Quando</th>
            <th className="px-2 py-2">Admin</th>
            <th className="px-2 py-2">Ação</th>
            <th className="px-2 py-2">Alvo</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-slate-800/80">
              <td className="whitespace-nowrap px-2 py-2 text-slate-400">
                {new Date(e.created_at).toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </td>
              <td className="max-w-[120px] truncate px-2 py-2 text-slate-300">
                {e.admin_email}
              </td>
              <td className="px-2 py-2 text-cyan-300/90">{e.action}</td>
              <td className="max-w-[200px] truncate px-2 py-2 text-slate-500">
                {e.target_type ?? "—"} {e.target_id ? `· ${e.target_id}` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {entries.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">Nenhum registro ainda.</p>
      ) : null}
    </div>
  );
}
