"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import type { SiteConfigData } from "@/lib/siteConfig";

export function SiteBanner() {
  const pathname = usePathname();
  const [cfg, setCfg] = useState<SiteConfigData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/site-config");
        const data = (await res.json()) as { data?: SiteConfigData };
        if (cancelled) return;
        setCfg(data.data ?? null);
      } catch {
        if (!cancelled) setCfg(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (pathname === "/login") return null;
  if (!cfg?.banner_enabled || dismissed) return null;
  const msg = (cfg.banner_message ?? "").trim();
  const title = (cfg.banner_title ?? "").trim();
  if (!msg && !title) return null;

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-100 md:text-sm">
      <div className="mx-auto flex max-w-4xl items-start justify-center gap-3">
        <div className="min-w-0 flex-1">
          {title ? (
            <p className="font-semibold text-amber-50">{title}</p>
          ) : null}
          {msg ? <p className="text-amber-100/95">{msg}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-lg p-1 text-amber-200/80 hover:bg-amber-500/20"
          aria-label="Fechar aviso"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
