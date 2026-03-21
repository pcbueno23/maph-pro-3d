"use client";

import { ReactNode, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/store/authStore";
import { useAccessStore } from "@/store/accessStore";
import { clearUserData } from "@/lib/clearUserData";
import { syncProductsOnLogin } from "@/lib/productSync";
import { syncUserDataOnLogin } from "@/lib/userDataSync";
import { PersistUserData } from "./PersistUserData";

const PUBLIC_PATHS = ["/login"];

/** Com trial expirado o usuário só acessa estas rotas até assinar. */
const PAYWALL_EXCEPTION_PATHS = ["/pricing", "/trial-expired"];

interface Props {
  children: ReactNode;
}

export function AuthGuard({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, initialized, setAuth, setInitialized, clearAuth } =
    useAuthStore();
  const checked = useAccessStore((s) => s.checked);
  const allowed = useAccessStore((s) => s.allowed);
  const setAccess = useAccessStore((s) => s.setAccess);
  const setAccessError = useAccessStore((s) => s.setAccessError);
  const resetAccess = useAccessStore((s) => s.reset);
  const accessNonce = useAccessStore((s) => s.accessNonce);
  const lastUserIdRef = useRef<string | null>(null);

  const isPublic = PUBLIC_PATHS.includes(pathname);
  const isPaywallException = PAYWALL_EXCEPTION_PATHS.includes(pathname);

  useEffect(() => {
    if (!supabase) {
      setInitialized(true);
      return;
    }

    let cancelled = false;
    const failSafe = setTimeout(() => {
      // Evita travar indefinidamente em "Carregando sessão..."
      if (!cancelled) setInitialized(true);
    }, 4000);

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        setAuth(data.session?.user ?? null, data.session ?? null);
        setInitialized(true);
      })
      .catch(() => {
        if (cancelled) return;
        setInitialized(true);
      })
      .finally(() => {
        clearTimeout(failSafe);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth(session?.user ?? null, session ?? null);
      if (!session) {
        clearUserData();
        clearAuth();
        resetAccess();
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(failSafe);
      subscription.unsubscribe();
    };
  }, [setAuth, setInitialized, clearAuth, resetAccess]);

  useEffect(() => {
    if (user) {
      // Limpar primeiro para nunca mostrar dados de outro usuário (mesmo navegador / troca de conta)
      clearUserData();
      void (async () => {
        await syncProductsOnLogin(user.id);
        await syncUserDataOnLogin(user.id);
      })();
    }
  }, [user]);

  useEffect(() => {
    if (!initialized || isPublic) return;
    if (!user && supabase) {
      const redirect = encodeURIComponent(pathname || "/");
      router.replace(`/login?redirect=${redirect}`);
    }
  }, [initialized, isPublic, pathname, router, user]);

  useEffect(() => {
    if (!user) {
      lastUserIdRef.current = null;
      resetAccess();
      return;
    }
    const userChanged = lastUserIdRef.current !== user.id;
    lastUserIdRef.current = user.id;
    if (userChanged) resetAccess();
  }, [user?.id, resetAccess]);

  /** Paywall: trial por data da conta (sem cartão) ou assinatura Stripe ativa. */
  useEffect(() => {
    if (!initialized || !user || !supabase || isPublic) return;

    let cancelled = false;

    void (async () => {
      let token: string | undefined;
      const { data: sessionData } = await supabase.auth.getSession();
      token = sessionData.session?.access_token;
      // Após redirect do Stripe o cookie pode atrasar — tenta renovar sessão antes de travar.
      if (!token && !cancelled) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        token = refreshed.session?.access_token;
      }
      if (!token) {
        if (!cancelled) {
          setAccessError(
            "Não foi possível obter a sessão após o pagamento. Atualize a página (F5) ou entre novamente.",
          );
        }
        return;
      }
      if (cancelled) return;

      const controller = new AbortController();
      const ms = 25_000;
      const timeoutId = window.setTimeout(() => controller.abort(), ms);

      try {
        const res = await fetch("/api/account/access", {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = (await res.json()) as {
          allowed?: boolean;
          reason?: string;
          trialEndsAt?: string;
          accountCreatedAt?: string;
          hasPaidPlan?: boolean;
          daysRemaining?: number;
          error?: string;
        };

        if (cancelled) return;

        if (!res.ok) {
          setAccessError(data.error ?? "Não foi possível verificar o acesso.");
          return;
        }

        const fromCheckout =
          typeof window !== "undefined" &&
          /[?&]success=1(?:&|$)/.test(window.location.search);

        let accessData = data;
        // Voltando do Stripe, a assinatura pode demorar alguns segundos para listar na API.
        if (
          fromCheckout &&
          !accessData.hasPaidPlan &&
          !accessData.allowed
        ) {
          for (let r = 0; r < 3; r++) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            if (cancelled) return;
            const c2 = new AbortController();
            const t2 = window.setTimeout(() => c2.abort(), 20_000);
            try {
              const res2 = await fetch("/api/account/access", {
                headers: { Authorization: `Bearer ${token}` },
                signal: c2.signal,
              });
              const data2 = (await res2.json()) as typeof data;
              if (res2.ok) accessData = data2;
              if (accessData.hasPaidPlan || accessData.allowed) break;
            } catch {
              break;
            } finally {
              window.clearTimeout(t2);
            }
          }
        }

        setAccess({
          allowed: Boolean(accessData.allowed),
          reason: (accessData.reason ?? "trial_expired") as
            | "subscriber"
            | "app_trial"
            | "trial_expired"
            | "paywall_disabled",
          trialEndsAt: accessData.trialEndsAt ?? new Date().toISOString(),
          accountCreatedAt: accessData.accountCreatedAt ?? user.created_at,
          hasPaidPlan: Boolean(accessData.hasPaidPlan),
          daysRemaining: accessData.daysRemaining ?? 0,
        });
      } catch (e: unknown) {
        if (cancelled) return;
        const aborted =
          (e instanceof DOMException || e instanceof Error) &&
          e.name === "AbortError";
        setAccessError(
          aborted
            ? "Tempo esgotado ao verificar o acesso. Atualize a página."
            : "Erro de rede ao verificar o acesso.",
        );
      } finally {
        window.clearTimeout(timeoutId);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    initialized,
    user?.id,
    isPublic,
    accessNonce,
    setAccess,
    setAccessError,
  ]);

  useEffect(() => {
    if (!initialized || !user || isPublic) return;
    if (!checked || allowed === null) return;
    if (allowed) return;
    if (isPaywallException) return;
    router.replace("/trial-expired");
  }, [
    allowed,
    checked,
    initialized,
    isPaywallException,
    isPublic,
    router,
    user,
  ]);

  const gateBlocked =
    Boolean(user) &&
    !isPublic &&
    checked &&
    allowed === false &&
    !isPaywallException;

  if (!initialized && !isPublic) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="rounded-2xl bg-slate-900/80 px-6 py-4 text-sm text-slate-300 shadow-neon-cyan">
          Carregando sessão...
        </div>
      </div>
    );
  }

  if (
    Boolean(user) &&
    !isPublic &&
    !checked
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="rounded-2xl bg-slate-900/80 px-6 py-4 text-sm text-slate-300 shadow-neon-cyan">
          Verificando acesso ao app…
        </div>
      </div>
    );
  }

  if (gateBlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="rounded-2xl bg-slate-900/80 px-6 py-4 text-sm text-slate-300 shadow-neon-cyan">
          Redirecionando…
        </div>
      </div>
    );
  }

  return (
    <>
      {user ? <PersistUserData /> : null}
      {children}
    </>
  );
}

