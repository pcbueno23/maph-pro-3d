"use client";

import { Suspense, useEffect } from "react";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { LogIn, Mail, Lock, Chrome, Phone } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { upsertUserContact } from "@/lib/supabaseUserContact";
import { userFacingAuthError } from "@/lib/authUserMessages";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  /** Ex.: /login?signup=1 — abre direto em “Criar conta”. */
  useEffect(() => {
    const wantsSignup =
      searchParams.get("signup") === "1" ||
      searchParams.get("signup") === "true" ||
      searchParams.get("mode") === "signup";
    if (wantsSignup) setMode("signup");
  }, [searchParams]);

  if (!supabase) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="space-y-2 rounded-2xl bg-slate-900/80 px-6 py-4 text-sm">
          <p>
            O serviço de login não está disponível no momento. Tente mais tarde
            ou fale com o suporte.
          </p>
        </div>
      </div>
    );
  }

  function redirectBaseForAuth(): string {
    if (
      typeof process.env.NEXT_PUBLIC_APP_URL === "string" &&
      process.env.NEXT_PUBLIC_APP_URL.trim()
    ) {
      return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    }
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === "forgot") {
        const base = redirectBaseForAuth();
        if (!base) {
          setError(
            "Não foi possível enviar o link agora. Tente novamente mais tarde ou fale com o suporte.",
          );
          setLoading(false);
          return;
        }
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: `${base}/reset-password` },
        );
        if (resetErr) throw resetErr;
        setMessage(
          "Se existir uma conta com este e-mail, você receberá um link para definir uma nova senha.",
        );
        setMode("signin");
        setLoading(false);
        return;
      }
      if (mode === "signin") {
        const { error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });
        if (signInError) throw signInError;
        router.replace(redirectTo as Parameters<typeof router.replace>[0]);
      } else {
        const phoneTrim = phone.trim();
        /** Chave `contact_whatsapp` evita conflito com campos reservados do Auth; cópia em `public.user_contact`. */
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              contact_whatsapp: phoneTrim,
            },
          },
        });
        if (signUpError) throw signUpError;
        const uid = signUpData.user?.id;
        if (uid && signUpData.session) {
          try {
            await upsertUserContact(uid, phoneTrim);
          } catch {
            /* trigger em auth.users também preenche user_contact quando há metadata */
          }
        }
        setMessage(
          "Conta criada. Verifique seu e-mail para confirmar o acesso, se necessário.",
        );
        setMode("signin");
      }
    } catch (err: unknown) {
      setError(userFacingAuthError(err, mode));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (!supabase) return;
    setError(null);
    setLoading(true);
    try {
      // Em produção (Vercel) usar sempre a URL do app; em dev usar a origem atual (localhost)
      const appUrl =
        typeof process.env.NEXT_PUBLIC_APP_URL === "string" &&
        process.env.NEXT_PUBLIC_APP_URL
          ? process.env.NEXT_PUBLIC_APP_URL
          : typeof window !== "undefined"
            ? window.location.origin
            : "";
      const redirectTo = appUrl
        ? `${appUrl.replace(/\/$/, "")}/dashboard`
        : undefined;
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });
    } catch (err: unknown) {
      setError(
        userFacingAuthError(err, "oauth") ||
          "Não foi possível abrir o login com Google. Tente de novo.",
      );
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-slate-100">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-6 shadow-neon-cyan backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-slate-900/80">
            <Image
              src="/logo-maph-pro-3d.png"
              alt="MAPH PRO 3D"
              width={64}
              height={64}
              className="h-12 w-12 object-contain"
              priority
            />
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold tracking-tight text-slate-50">
              MAPH PRO 3D
            </p>
            <p className="text-[11px] text-slate-400">
              Profissionalize seu negócio 3D
            </p>
            <h1 className="mt-2 text-lg font-semibold text-slate-100">
              {mode === "signin"
                ? "Entrar na sua conta"
                : mode === "signup"
                  ? "Criar conta para começar"
                  : "Recuperar senha"}
            </h1>
          </div>
        </div>

        {mode === "forgot" ? (
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError(null);
              setMessage(null);
            }}
            className="text-xs text-cyan-400 transition hover:text-cyan-300"
          >
            ← Voltar ao login
          </button>
        ) : (
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
        )}

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

          {mode === "signup" ? (
            <div className="space-y-2 text-sm">
              <label className="mb-1 block text-xs text-slate-300">
                Telefone (WhatsApp)
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
                <Phone className="h-4 w-4 shrink-0 text-slate-500" />
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  placeholder="DDD + número do WhatsApp"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Usamos para falar com você sobre pedidos, suporte e novidades do
                seu negócio.
              </p>
            </div>
          ) : null}

          {mode === "forgot" ? null : (
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
          )}

          {mode === "signin" ? (
            <div className="text-right">
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError(null);
                  setMessage(null);
                }}
                className="text-xs text-cyan-400 transition hover:text-cyan-300"
              >
                Esqueci minha senha
              </button>
            </div>
          ) : null}

          {error && (
            <p className="whitespace-pre-wrap text-xs text-rose-400">
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
            {mode === "signin"
              ? "Entrar"
              : mode === "signup"
                ? "Criar conta"
                : "Enviar link de recuperação"}
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

