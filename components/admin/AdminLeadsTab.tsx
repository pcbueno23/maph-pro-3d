"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw, Search } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { AdminLeadRow } from "@/lib/adminLeadDto";

type ListResponse = {
  page: number;
  perPage: number;
  total: number;
  leads: AdminLeadRow[];
  error?: string;
};

function csvEscape(value: string): string {
  const v = value.replace(/"/g, '""');
  return `"${v}"`;
}

export function AdminLeadsTab() {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage] = useState(50);
  const [leads, setLeads] = useState<AdminLeadRow[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");

  const fetchLeads = useCallback(
    async (p: number, overrides?: { q?: string; from?: string; to?: string }) => {
      if (!supabase) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;

      const q = overrides?.q ?? appliedQ;
      const from = overrides?.from ?? appliedFrom;
      const to = overrides?.to ?? appliedTo;

      setLoading(true);
      setLoadError(null);
      try {
        const params = new URLSearchParams();
        params.set("page", String(p));
        params.set("perPage", String(perPage));
        if (q.trim()) params.set("q", q.trim());
        if (from.trim()) params.set("createdFrom", from.trim());
        if (to.trim()) params.set("createdTo", to.trim());

        const res = await fetch(`/api/admin/leads?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json()) as ListResponse;
        if (!res.ok) {
          setLoadError(data.error ?? "Erro ao carregar leads.");
          setLeads([]);
          return;
        }
        setPage(data.page);
        setTotal(data.total);
        setLeads(data.leads);
      } catch {
        setLoadError("Erro de rede ao carregar leads.");
        setLeads([]);
      } finally {
        setLoading(false);
      }
    },
    [perPage, appliedQ, appliedFrom, appliedTo],
  );

  useEffect(() => {
    void fetchLeads(1);
  }, [fetchLeads]);

  function exportCsv() {
    const header = ["email", "whatsapp", "criado_em", "origem", "user_id"];
    const rows = leads.map((l) =>
      [
        csvEscape(l.email),
        csvEscape(l.whatsapp_display || l.whatsapp),
        csvEscape(new Date(l.created_at).toISOString()),
        csvEscape(l.source),
        csvEscape(l.user_id),
      ].join(","),
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-maph-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Lista de cadastros com <strong className="text-slate-200">e-mail</strong> e{" "}
        <strong className="text-slate-200">WhatsApp</strong> informados no signup (ou ao
        completar cadastro via Google). Exporte em CSV para campanhas futuras.
      </p>

      <div className="rounded-xl border border-slate-800/90 bg-slate-950/40 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-xs text-slate-500 sm:col-span-2">
            Buscar
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="E-mail ou WhatsApp…"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-8 pr-2 text-sm text-slate-200"
              />
            </div>
          </label>
          <label className="block text-xs text-slate-500">
            De
            <input
              type="date"
              value={createdFrom}
              onChange={(e) => setCreatedFrom(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-200"
            />
          </label>
          <label className="block text-xs text-slate-500">
            Até
            <input
              type="date"
              value={createdTo}
              onChange={(e) => setCreatedTo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-200"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setAppliedQ(searchQ);
              setAppliedFrom(createdFrom);
              setAppliedTo(createdTo);
              void fetchLeads(1, {
                q: searchQ,
                from: createdFrom,
                to: createdTo,
              });
            }}
            disabled={loading}
            className="rounded-lg bg-cyan-600/90 px-4 py-2 text-xs font-medium text-slate-950 hover:bg-cyan-500 disabled:opacity-50"
          >
            Aplicar
          </button>
          <button
            type="button"
            onClick={() => void fetchLeads(page)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={leads.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/50 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar CSV (página)
          </button>
        </div>
      </div>

      {loadError ? (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {loadError}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Carregando leads…</p>
      ) : null}

      {!loading && leads.length === 0 && !loadError ? (
        <p className="text-sm text-slate-500">
          Nenhum lead ainda. Novos cadastros com WhatsApp aparecem aqui após a migration no
          Supabase.
        </p>
      ) : null}

      {leads.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3 font-medium">E-mail</th>
                <th className="px-3 py-3 font-medium">WhatsApp</th>
                <th className="px-3 py-3 font-medium">Cadastro</th>
                <th className="px-3 py-3 font-medium">Origem</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr
                  key={l.id}
                  className="border-b border-slate-800/80 last:border-0 hover:bg-slate-900/30"
                >
                  <td className="max-w-[220px] truncate px-3 py-2.5 text-slate-200">
                    {l.email || "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-300">
                    {l.whatsapp_display || l.whatsapp || "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-400">
                    {new Date(l.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500">{l.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            Página {page} de {totalPages} · {total} lead(s)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => void fetchLeads(page - 1)}
              className="rounded-lg border border-slate-700 px-3 py-1.5 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => void fetchLeads(page + 1)}
              className="rounded-lg border border-slate-700 px-3 py-1.5 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
