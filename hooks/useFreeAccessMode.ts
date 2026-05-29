"use client";

import { useEffect, useState } from "react";
import { useAccessStore } from "@/store/accessStore";

/** App em modo gratuito (paywall desligado) — oculta Assinaturas e bloqueia /pricing. */
export function useFreeAccessMode(): boolean {
  const reason = useAccessStore((s) => s.reason);
  const [serverFree, setServerFree] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/app/access-mode", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { freeAccess?: boolean }) => {
        if (!cancelled) setServerFree(Boolean(d.freeAccess));
      })
      .catch(() => {
        if (!cancelled) setServerFree(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (reason === "paywall_disabled") return true;
  if (serverFree === true) return true;
  return false;
}
