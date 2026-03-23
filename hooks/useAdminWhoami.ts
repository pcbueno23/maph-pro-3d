"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/store/authStore";

/** null = ainda não carregou ou sem sessão */
export function useAdminWhoami(): boolean | null {
  const user = useAuthStore((s) => s.user);
  const [admin, setAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user || !supabase) {
      setAdmin(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        if (!cancelled) setAdmin(null);
        return;
      }
      try {
        const res = await fetch("/api/admin/whoami", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (res.status === 401) {
          setAdmin(null);
          return;
        }
        const body = (await res.json()) as { admin?: boolean };
        setAdmin(Boolean(body.admin));
      } catch {
        if (!cancelled) setAdmin(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return admin;
}
