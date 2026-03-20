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
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token || cancelled) return;

      try {
        const res = await fetch("/api/account/access", {
          headers: { Authorization: `Bearer ${token}` },
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

        setAccess({
          allowed: Boolean(data.allowed),
          reason: (data.reason ?? "trial_expired") as
            | "subscriber"
            | "app_trial"
            | "trial_expired"
            | "paywall_disabled",
          trialEndsAt: data.trialEndsAt ?? new Date().toISOString(),
          accountCreatedAt: data.accountCreatedAt ?? user.created_at,
          hasPaidPlan: Boolean(data.hasPaidPlan),
          daysRemaining: data.daysRemaining ?? 0,
        });
      } catch {
        if (!cancelled) {
          setAccessError("Erro de rede ao verificar o acesso.");
        }
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

