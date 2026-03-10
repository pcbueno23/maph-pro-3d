"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/store/authStore";
import { syncProductsOnLogin } from "@/lib/productSync";
import { syncUserDataOnLogin } from "@/lib/userDataSync";
import { PersistUserData } from "./PersistUserData";

const PUBLIC_PATHS = ["/login"];

interface Props {
  children: ReactNode;
}

export function AuthGuard({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, initialized, setAuth, setInitialized, clearAuth } =
    useAuthStore();

  const isPublic = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (!supabase) {
      setInitialized(true);
      return;
    }

    let cancelled = false;

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
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth(session?.user ?? null, session ?? null);
      if (!session) {
        clearAuth();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [setAuth, setInitialized, clearAuth]);

  useEffect(() => {
    if (user) {
      void (async () => {
        await syncProductsOnLogin(user.id);
        await syncUserDataOnLogin(user.id);
      })();
    }
  }, [user]);

  useEffect(() => {
    if (!initialized || isPublic) return;
    if (!user && supabase) {
      const redirect = encodeURIComponent(pathname || "/dashboard");
      router.replace(`/login?redirect=${redirect}`);
    }
  }, [initialized, isPublic, pathname, router, user]);

  if (!initialized && !isPublic) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="rounded-2xl bg-slate-900/80 px-6 py-4 text-sm text-slate-300 shadow-neon-cyan">
          Carregando sessão...
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

