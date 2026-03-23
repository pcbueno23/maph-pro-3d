"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { AdminUserRow } from "@/lib/adminUserDto";
import { UserDetailModal } from "@/components/admin/UserDetailModal";

type ListResponse = {
  appTrialDays: number;
  page: number;
  perPage: number;
  total: number;
  users: AdminUserRow[];
  error?: string;
};

export function AdminUsersTab() {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [appTrialDays, setAppTrialDays] = useState(7);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage] = useState(50);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editIso, setEditIso] = useState<Record<string, string>>({});
  const [searchQ, setSearchQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchHits, setSearchHits] = useState<AdminUserRow[] | null>(null);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

  const fetchUsers = useCallback(async (p: number) => {
    if (!supabase) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;

    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/admin/users?page=${p}&perPage=${perPage}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as ListResponse;
      if (!res.ok) {
        setLoadError(data.error ?? "Erro ao carregar usuários.");
        setUsers([]);
        return;
      }
      setAppTrialDays(data.appTrialDays);
      setPage(data.page);
      setTotal(data.total);
      setUsers(data.users);
      const iso: Record<string, string> = {};
      for (const u of data.users) {
        iso[u.id] =
          u.trial_ends_at_metadata ?? u.effective_trial_ends_at;
      }
      setEditIso(iso);
    } catch {
      setLoadError("Erro de rede ao carregar usuários.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [perPage]);

  useEffect(() => {
    void fetchUsers(1);
  }, [fetchUsers]);

  useEffect(() => {
    if (searchQ.trim().length < 2) {
      setSearchHits(null);
      return;
    }
    const t = window.setTimeout(() => {
      void (async () => {
        if (!supabase) return;
        setSearching(true);
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token;
          if (!token) return;
          const res = await fetch(
            `/api/admin/users/search?q=${encodeURIComponent(searchQ.trim())}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          const data = (await res.json()) as {
            users?: AdminUserRow[];
            error?: string;
          };
          if (res.ok && Array.isArray(data.users)) {
            setSearchHits(data.users);
          } else {
            setSearchHits([]);
          }
        } catch {
          setSearchHits([]);
        } finally {
          setSearching(false);
        }
      })();
    }, 400);
    return () => window.clearTimeout(t);
  }, [searchQ]);

  async function saveTrial(userId: string) {
    if (!supabase) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;

    const iso = editIso[userId]?.trim();
    setSavingId(userId);
    setLoadError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trial_ends_at: iso && iso.length > 0 ? iso : null,
        }),
      });
      const data = (await res.json()) as { error?: string; user?: AdminUserRow };
      if (!res.ok) {
        setLoadError(data.error ?? "Falha ao salvar.");
        return;
      }
      if (data.user) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? data.user! : u)),
        );
        setSearchHits((prev) =>
          prev
            ? prev.map((u) => (u.id === userId ? data.user! : u))
            : null,
        );
        setEditIso((prev) => ({
          ...prev,
          [userId]:
            data.user!.trial_ends_at_metadata ??
            data.user!.effective_trial_ends_at,
        }));
      }
    } catch {
      setLoadError("Erro de rede ao salvar.");
    } finally {
      setSavingId(null);
    }
  }

  async function clearTrial(userId: string) {
    if (!supabase) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    setSavingId(userId);
    setLoadError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ trial_ends_at: null }),
      });
      const data = (await res.json()) as { error?: string; user?: AdminUserRow };
      if (!res.ok) {
        setLoadError(data.error ?? "Falha ao limpar override.");
        return;
      }
      if (data.user) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? data.user! : u)),
        );
        setSearchHits((prev) =>
          prev
            ? prev.map((u) => (u.id === userId ? data.user! : u))
            : null,
        );
        setEditIso((prev) => ({
          ...prev,
          [userId]: data.user!.effective_trial_ends_at,
        }));
      }
    } catch {
      setLoadError("Erro de rede.");
    } finally {
      setSavingId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  function mergeUpdated(u: AdminUserRow) {
    setUsers((prev) => prev.map((x) => (x.id === u.id ? u : x)));
    setSearchHits((prev) =>
      prev ? prev.map((x) => (x.id === u.id ? u : x)) : null,
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Trial padrão:{" "}
        <strong className="text-slate-200">{appTrialDays}</strong> dias (
        <code className="text-xs text-cyan-300">APP_TRIAL_DAYS</code>). Override:{" "}
        <code className="text-xs text-cyan-300">trial_ends_at</code>.
      </p>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="Buscar por e-mail ou ID (2+ caracteres)…"
          className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2.5 pl-10 pr-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-cyan-500/40 focus:outline-none"
        />
        {searching ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">
            Buscando…
          </span>
        ) : null}
      </div>

      {searchHits && searchQ.trim().length >= 2 ? (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
          <p className="text-xs font-medium text-cyan-300/90">
            Resultados ({searchHits.length})
          </p>
          <ul className="mt-2 space-y-1">
            {searchHits.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300"
              >
                <span className="truncate">{u.email}</span>
                <button
                  type="button"
                  onClick={() => setDetailUserId(u.id)}
                  className="shrink-0 rounded-lg border border-slate-600 px-2 py-0.5 text-[11px] text-cyan-300 hover:bg-slate-800"
                >
                  Detalhes
                </button>
              </li>
            ))}
          </ul>
          {searchHits.length === 0 ? (
            <p className="text-xs text-slate-500">Nenhum resultado.</p>
          ) : null}
        </div>
      ) : null}

      {loadError && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {loadError}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Carregando usuários…</p>
      ) : null}

      {!loading && users.length === 0 && !loadError ? (
        <p className="text-sm text-slate-500">Nenhum usuário nesta página.</p>
      ) : null}

      {users.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[800px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3 font-medium">E-mail</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Criado</th>
                <th className="px-3 py-3 font-medium">Último login</th>
                <th className="px-3 py-3 font-medium">Fim trial</th>
                <th className="px-3 py-3 font-medium">Override ISO</th>
                <th className="px-3 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-slate-800/80 last:border-0 hover:bg-slate-900/30"
                >
                  <td className="max-w-[180px] truncate px-3 py-2.5 text-slate-200">
                    {u.email || "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {u.is_banned ? (
                      <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] text-red-300">
                        Banido
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-400">
                    {new Date(u.created_at).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-400">
                    {u.last_sign_in_at
                      ? new Date(u.last_sign_in_at).toLocaleString("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <span
                      className={
                        u.uses_custom_trial
                          ? "text-cyan-300"
                          : "text-slate-400"
                      }
                    >
                      {new Date(u.effective_trial_ends_at).toLocaleString(
                        "pt-BR",
                        { dateStyle: "short", timeStyle: "short" },
                      )}
                    </span>
                    {u.uses_custom_trial ? (
                      <span className="ml-2 text-[10px] text-cyan-500/90">
                        manual
                      </span>
                    ) : null}
                  </td>
                  <td className="min-w-[180px] px-3 py-2">
                    <input
                      type="text"
                      value={editIso[u.id] ?? ""}
                      onChange={(e) =>
                        setEditIso((prev) => ({
                          ...prev,
                          [u.id]: e.target.value,
                        }))
                      }
                      placeholder="2026-12-31T23:59:59.000Z"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-2 py-1.5 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none"
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailUserId(u.id)}
                        className="rounded-lg border border-slate-600 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-800"
                      >
                        Detalhes
                      </button>
                      <button
                        type="button"
                        disabled={savingId === u.id}
                        onClick={() => void saveTrial(u.id)}
                        className="rounded-lg bg-cyan-600/90 px-2.5 py-1 text-xs font-medium text-slate-950 transition hover:bg-cyan-500 disabled:opacity-50"
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        disabled={savingId === u.id || !u.uses_custom_trial}
                        onClick={() => void clearTrial(u.id)}
                        className="rounded-lg border border-slate-600 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-slate-800 disabled:opacity-40"
                      >
                        Padrão
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
          <span>
            Página {page} de {totalPages} ({total} contas)
          </span>
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => void fetchUsers(page - 1)}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-200 transition hover:bg-slate-800 disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => void fetchUsers(page + 1)}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-200 transition hover:bg-slate-800 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      ) : null}

      {detailUserId ? (
        <UserDetailModal
          userId={detailUserId}
          onClose={() => setDetailUserId(null)}
          onUserUpdated={mergeUpdated}
        />
      ) : null}
    </div>
  );
}
