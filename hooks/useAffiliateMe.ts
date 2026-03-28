"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/store/authStore";
import type { Affiliate } from "@/lib/affiliates";

export type AffiliateMeState =
  | { status: "loading" }
  | { status: "none" }
  | { status: "active"; affiliate: Affiliate };

export function useAffiliateMe(): AffiliateMeState {
  const user = useAuthStore((s) => s.user);
  const [state, setState] = useState<AffiliateMeState>({ status: "loading" });

  useEffect(() => {
    if (!user || !supabase) {
      setState({ status: "none" });
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        if (!cancelled) setState({ status: "none" });
        return;
      }
      try {
        const res = await fetch("/api/affiliates/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        const body = (await res.json()) as { affiliate?: Affiliate | null };
        if (body.affiliate) {
          setState({ status: "active", affiliate: body.affiliate });
        } else {
          setState({ status: "none" });
        }
      } catch {
        if (!cancelled) setState({ status: "none" });
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  return state;
}
