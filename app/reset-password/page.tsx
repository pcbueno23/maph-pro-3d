"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Lock } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const RECOVERY_KEY = "supabase-pw-recovery";

function appOrigin(): string {
  if (
    typeof process.env.NEXT_PUBLIC_APP_URL === "string" &&
    process.env.NEXT_PUBLIC_APP_URL.trim()
  ) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [allowReset, setAllowReset] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    try {
      if (sessionStorage.getItem(RECOVERY_KEY) === "1") {
        setAllowReset(true);
      }
    } catch {
      /* ignore */
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setHasSession(Boolean(data.session));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        try {
          sessionStorage.setItem(RECOVERY_KEY, "1");
        } catch {
          /* ignore */
        }
        setAllowReset(true);
      }
      setHasSession(Boolean(session));
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setError(null);
    setMessage(null);
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== password2) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const { error: updErr } = await supabase.auth.updateUser({
        password,
      });
      if (updErr) throw updErr;
      try {
        sessionStorage.removeItem(RECOVERY_KEY);
      } catch {
        /* ignore */
      }
      setMessage("Senha atualizada. Redirecionando…");
      setTimeout(() => {
        router.replace("/");
      }, 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setLoading(false);
    }
  }

  if (!supabase) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-200">
        <p className="text-sm">Supabase não configurado.</p>
      </div>
    );
  }

  if (hasSession === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Carregando…
      </div>
    );
  }

  const canSetPassword = hasSession && allowReset;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-6 shadow-neon-cyan backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-600">
            <KeyRound className="h-5 w-5 text-slate-950" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-400">
              MAPH PRO 3D
            </p>
            <h1 className="text-lg font-semibold">Nova senha</h1>
          </div>
        </div>

        {!hasSession ? (
          <div className="space-y-3 text-sm text-slate-400">
            <p>
              Link inválido ou sessão expirada. Peça um novo e-mail em{" "}
              <Link href="/login" className="text-cyan-400 underline">
                Entrar
              </Link>{" "}
              → Esqueci minha senha.
            </p>
            <p className="text-xs text-slate-500">
              Em Authentication → URL Configuration, inclua{" "}
              <code className="break-all text-cyan-600/90">
                {appOrigin()}/reset-password
              </code>{" "}
              em Redirect URLs.
            </p>
          </div>
        ) : !canSetPassword ? (
          <div className="space-y-3 text-sm text-slate-400">
            <p>
              Abra o link de recuperação que você recebeu por e-mail (ele marca
              esta página como segura para trocar a senha). Se você entrou por
              outro meio, use{" "}
              <Link href="/login" className="text-cyan-400 underline">
                Esqueci minha senha
              </Link>{" "}
              no login.
            </p>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <p className="text-sm text-slate-400">
              Defina uma nova senha para sua conta.
            </p>
            <div className="space-y-2 text-sm">
              <label className="text-xs text-slate-300">Nova senha</label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
                <Lock className="h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <label className="text-xs text-slate-300">Confirmar senha</label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
                <Lock className="h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none"
                  placeholder="Repita a senha"
                />
              </div>
            </div>
            {error ? (
              <p className="text-xs text-rose-400">{error}</p>
            ) : null}
            {message ? (
              <p className="text-xs text-emerald-400">{message}</p>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-70"
            >
              Salvar nova senha
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
