"use client";

import { Suspense } from "react";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, Mail, Lock, Chrome } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!supabase) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="space-y-2 rounded-2xl bg-slate-900/80 px-6 py-4 text-sm">
          <p>
            Supabase não está configurado. Defina as variáveis{" "}
            <span className="font-mono text-xs">
              NEXT_PUBLIC_SUPABASE_URL
            </span>{" "}
            e{" "}
            <span className="font-mono text-xs">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </span>{" "}
            no arquivo <span className="font-mono text-xs">.env.local</span>.
          </p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        const { error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });
        if (signInError) throw signInError;
        router.replace(redirectTo as Parameters<typeof router.replace>[0]);
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        setMessage(
          "Conta criada. Verifique seu e-mail para confirmar o acesso, se necessário.",
        );
        setMode("signin");
      }
    } catch (err: any) {
      setError(err.message ?? "Não foi possível autenticar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (!supabase) return;
    setError(null);
    setLoading(true);
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: origin ? `${origin}/dashboard` : undefined,
        },
      });
    } catch (err: any) {
      setError(err.message ?? "Erro ao iniciar login com Google.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-slate-100">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-6 shadow-neon-cyan backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500 via-purple-500 to-emerald-500" />
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-400">
              Precifica3D
            </p>
            <h1 className="text-lg font-semibold">
              {mode === "signin"
                ? "Entrar na sua conta"
                : "Criar conta para começar"}
            </h1>
          </div>
        </div>

        <div className="flex gap-1 rounded-full bg-slate-900/70 p-1 text-xs">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`flex-1 rounded-full px-3 py-1.5 ${
              mode === "signin"
                ? "bg-slate-800 text-slate-100"
                : "text-slate-400"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-full px-3 py-1.5 ${
              mode === "signup"
                ? "bg-slate-800 text-slate-100"
                : "text-slate-400"
            }`}
          >
            Criar conta
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2 text-sm">
            <label className="mb-1 block text-xs text-slate-300">
              E-mail
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
              <Mail className="h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none"
                placeholder="voce@makerlab.com"
              />
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <label className="mb-1 block text-xs text-slate-300">
              Senha
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
              <Lock className="h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-400">
              {error}
            </p>
          )}

          {message && (
            <p className="text-xs text-emerald-400">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <LogIn className="h-4 w-4" />
            {mode === "signin" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="h-px flex-1 bg-slate-800" />
            <span>ou continue com</span>
            <span className="h-px flex-1 bg-slate-800" />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogle}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-sm text-slate-100 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Chrome className="h-4 w-4 text-cyan-400" />
            Entrar com Google
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
          Carregando…
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}

