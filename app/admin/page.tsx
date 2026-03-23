"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { AdminUserRow } from "@/lib/adminUserDto";

type ListResponse = {
  appTrialDays: number;
  page: number;
  perPage: number;
  total: number;
  users: AdminUserRow[];
  error?: string;
};

export default function AdminPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [appTrialDays, setAppTrialDays] = useState(7);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(50);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editIso, setEditIso] = useState<Record<string, string>>({});

  const fetchUsers = useCallback(async (p: number) => {
    if (!supabase) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setAllowed(false);
      setLoading(false);
      return;
    }

    const who = await fetch("/api/admin/whoami", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const whoBody = (await who.json()) as { admin?: boolean };
    if (!who.ok || !whoBody.admin) {
      setAllowed(false);
      setLoading(false);
      return;
    }
    setAllowed(true);

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
      setPerPage(data.perPage);
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

  if (allowed === false) {
    return (
      <div className="space-y-3 text-slate-200">
        <h1 className="text-lg font-semibold text-slate-50">Admin</h1>
        <p className="text-sm text-slate-400">
          Você não tem permissão para acessar esta área. Defina seu e-mail em{" "}
          <code className="rounded bg-slate-900 px-1.5 py-0.5 text-xs text-cyan-300">
            ADMIN_EMAILS
          </code>{" "}
          no servidor e reinicie o app.
        </p>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-6 text-slate-200">
      <div>
        <h1 className="text-lg font-semibold text-slate-50">Painel admin</h1>
        <p className="mt-1 text-sm text-slate-400">
          Usuários do Supabase Auth. Trial padrão:{" "}
          <strong className="text-slate-200">{appTrialDays}</strong> dias a partir
          da criação da conta (<code className="text-xs text-cyan-300">APP_TRIAL_DAYS</code>
          ). Sobrescreva o fim do teste por usuário abaixo (
          <code className="text-xs text-cyan-300">trial_ends_at</code>).
        </p>
      </div>

      {loadError && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {loadError}
        </div>
      )}

      {loading && allowed ? (
        <p className="text-sm text-slate-500">Carregando usuários…</p>
      ) : null}

      {!loading && allowed && users.length === 0 && !loadError ? (
        <p className="text-sm text-slate-500">Nenhum usuário nesta página.</p>
      ) : null}

      {allowed && users.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3 font-medium">E-mail</th>
                <th className="px-3 py-3 font-medium">Criado</th>
                <th className="px-3 py-3 font-medium">Último login</th>
                <th className="px-3 py-3 font-medium">Fim do trial (efetivo)</th>
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
                  <td className="max-w-[200px] truncate px-3 py-2.5 text-slate-200">
                    {u.email || "—"}
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
                  <td className="min-w-[200px] px-3 py-2">
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

      {allowed && totalPages > 1 ? (
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
    </div>
  );
}
