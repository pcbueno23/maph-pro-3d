"use client";

import { useEffect, useState } from "react";
import { ExternalLink, MessageCircle, FileText } from "lucide-react";
import type { SiteConfigData } from "@/lib/siteConfig";

type Props = {
  className?: string;
};

/**
 * Links públicos configurados no admin (Site e banner): WhatsApp e termos.
 */
export function SitePublicLinks({ className = "" }: Props) {
  const [cfg, setCfg] = useState<SiteConfigData | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/site-config");
        const data = (await res.json()) as { data?: SiteConfigData };
        if (!cancelled) setCfg(data.data ?? null);
      } catch {
        if (!cancelled) setCfg(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const wa = (cfg?.support_whatsapp_link ?? "").trim();
  const terms = (cfg?.terms_url ?? "").trim();
  const waLabel =
    (cfg?.support_whatsapp_display ?? "").trim() || "Suporte no WhatsApp";

  if (!wa && !terms) return null;

  return (
    <footer
      className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-slate-800/80 px-4 py-3 text-[11px] text-slate-500 ${className}`}
    >
      {wa ? (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-slate-400 transition hover:text-cyan-400"
        >
          <MessageCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{waLabel}</span>
          <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
        </a>
      ) : null}
      {terms ? (
        <a
          href={terms}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-slate-400 transition hover:text-cyan-400"
        >
          <FileText className="h-3.5 w-3.5 shrink-0" />
          Termos de uso
          <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
        </a>
      ) : null}
    </footer>
  );
}
