"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { AdminPaymentSummary } from "@/lib/adminPaymentSummary";
import type { AdminUserRow } from "@/lib/adminUserDto";

type Props = {
  userId: string;
  onClose: () => void;
  onUserUpdated: (u: AdminUserRow) => void;
};

export function UserDetailModal({ userId, onClose, onUserUpdated }: Props) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [user, setUser] = useState<AdminUserRow | null>(null);
  const [payment, setPayment] = useState<AdminPaymentSummary | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [trialDraft, setTrialDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [linkOut, setLinkOut] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!supabase) return;
      setLoading(true);
      setErr(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          setErr("Sem sessão.");
          return;
        }
        const res = await fetch(`/api/admin/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json()) as {
          error?: string;
          user?: AdminUserRow;
          payment?: AdminPaymentSummary;
        };
        if (cancelled) return;
        if (!res.ok) {
          setErr(data.error ?? "Erro ao carregar.");
          return;
        }
        if (data.user) {
          setUser(data.user);
          setNoteDraft(data.user.admin_notes ?? "");
          setTrialDraft(
            data.user.trial_ends_at_metadata ??
              data.user.effective_trial_ends_at,
          );
        }
        if (data.payment) setPayment(data.payment);
      } catch {
        if (!cancelled) setErr("Erro de rede.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function getToken() {
    if (!supabase) return null;
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.access_token ?? null;
  }

  async function saveMeta() {
    const token = await getToken();
    if (!token) return;
    setSaving(true);
    setErr(null);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trial_ends_at: trialDraft.trim() || null,
          admin_notes: noteDraft.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string; user?: AdminUserRow };
      if (!res.ok) {
        setErr(data.error ?? "Falha ao salvar.");
        return;
      }
      if (data.user) {
        setUser(data.user);
        onUserUpdated(data.user);
        setActionMsg("Salvo.");
      }
    } catch {
      setErr("Erro de rede.");
    } finally {
      setSaving(false);
    }
  }

  async function postAction(
    action: "ban" | "unban" | "send_recovery" | "send_magic",
  ) {
    const token = await getToken();
    if (!token) return;
    setSaving(true);
    setErr(null);
    setActionMsg(null);
    setLinkOut(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/actions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as {
        error?: string;
        user?: AdminUserRow;
        action_link?: string | null;
        message?: string;
      };
      if (!res.ok) {
        setErr(data.error ?? "Falha na ação.");
        return;
      }
      if (data.user) {
        setUser(data.user);
        onUserUpdated(data.user);
      }
      if (data.action_link) {
        setLinkOut(data.action_link);
        setActionMsg(data.message ?? "Link gerado.");
      } else {
        setActionMsg(
          action === "ban"
            ? "Usuário banido."
            : action === "unban"
              ? "Banimento removido."
              : "Ok.",
        );
      }
    } catch {
      setErr("Erro de rede.");
    } finally {
      setSaving(false);
    }
  }

  if (!user && !loading && err) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
        <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-200">
          <p className="text-sm text-amber-200">{err}</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 rounded-lg border border-slate-600 px-3 py-1.5 text-sm"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-200 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-50">
              Detalhes do usuário
            </h2>
            {user ? (
              <p className="mt-1 break-all text-xs text-slate-400">{user.email}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Carregando…</p>
        ) : user ? (
          <div className="space-y-4 text-sm">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-xs font-medium uppercase text-slate-500">Conta</p>
              <p className="mt-1 text-slate-300">
                Criado:{" "}
                {new Date(user.created_at).toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
              <p className="text-slate-300">
                Último login:{" "}
                {user.last_sign_in_at
                  ? new Date(user.last_sign_in_at).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })
                  : "—"}
              </p>
              <p className="mt-1">
                {user.is_banned ? (
                  <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-300">
                    Banido até{" "}
                    {user.banned_until
                      ? new Date(user.banned_until).toLocaleString("pt-BR")
                      : "—"}
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                    Conta ativa
                  </span>
                )}
              </p>
            </div>

            {payment ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-xs font-medium uppercase text-slate-500">
                  Pagamento
                </p>
                <p className="mt-1 text-slate-300">
                  Provedor: <strong>{payment.provider}</strong>
                </p>
                <p className="text-slate-300">
                  Plano: <strong>{payment.plan}</strong> · Pago:{" "}
                  <strong>{payment.paid ? "sim" : "não"}</strong>
                </p>
                {payment.error ? (
                  <p className="mt-1 text-xs text-amber-400">{payment.error}</p>
                ) : null}
              </div>
            ) : null}

            <div>
              <label className="text-xs text-slate-500">Override trial (ISO)</label>
              <input
                type="text"
                value={trialDraft}
                onChange={(e) => setTrialDraft(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500">Nota interna (admin)</label>
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs"
                placeholder="Visível só no painel (metadata)"
              />
            </div>

            {err ? (
              <p className="text-xs text-amber-300">{err}</p>
            ) : null}
            {actionMsg ? (
              <p className="text-xs text-cyan-300">{actionMsg}</p>
            ) : null}
            {linkOut ? (
              <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-2">
                <p className="text-[10px] text-slate-500">Link (copie com cuidado)</p>
                <p className="break-all font-mono text-[10px] text-cyan-200">
                  {linkOut}
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveMeta()}
                className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-medium text-slate-950 disabled:opacity-50"
              >
                Salvar trial e nota
              </button>
            </div>

            <div className="border-t border-slate-800 pt-3">
              <p className="mb-2 text-xs font-medium text-slate-500">Ações</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving || user.is_banned}
                  onClick={() => void postAction("ban")}
                  className="rounded-lg border border-red-500/40 px-2.5 py-1 text-xs text-red-300 disabled:opacity-40"
                >
                  Banir
                </button>
                <button
                  type="button"
                  disabled={saving || !user.is_banned}
                  onClick={() => void postAction("unban")}
                  className="rounded-lg border border-slate-600 px-2.5 py-1 text-xs text-slate-300 disabled:opacity-40"
                >
                  Desbanir
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void postAction("send_recovery")}
                  className="rounded-lg border border-slate-600 px-2.5 py-1 text-xs text-slate-300"
                >
                  Link recuperação
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void postAction("send_magic")}
                  className="rounded-lg border border-slate-600 px-2.5 py-1 text-xs text-slate-300"
                >
                  Link magic
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
