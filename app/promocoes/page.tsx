"use client";

import { ExternalLink, Percent } from "lucide-react";
import { useEffect, useState } from "react";
import type { MarketingPromocao } from "@/lib/appMarketing";

type Plataforma = MarketingPromocao["plataforma"];

export default function PromocoesPage() {
  const [promocoes, setPromocoes] = useState<MarketingPromocao[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/marketing");
        const data = (await res.json()) as {
          promocoes?: MarketingPromocao[];
        };
        if (cancelled) return;
        if (res.ok && Array.isArray(data.promocoes)) {
          setPromocoes(data.promocoes);
        } else {
          setPromocoes([]);
          setLoadError(true);
        }
      } catch {
        if (!cancelled) {
          setPromocoes([]);
          setLoadError(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const badgePlataforma = (p: Plataforma) => {
    if (p === "Shopee")
      return (
        <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-medium text-orange-400">
          Shopee
        </span>
      );
    return (
      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400">
        ML
      </span>
    );
  };

  if (promocoes === null) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
            Promoções
          </h1>
          <p className="mt-1 text-sm text-slate-400">Carregando…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
          Promoções
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Links de indicação dos seus produtos no Mercado Livre e na Shopee.
        </p>
        {loadError ? (
          <p className="mt-2 text-xs text-amber-400/90">
            Não foi possível carregar as promoções. Tente atualizar a página.
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
        {promocoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/80 text-slate-500">
              <Percent className="h-6 w-6" />
            </div>
            <p className="text-sm text-slate-400">
              Nenhuma promoção cadastrada ainda.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Quem administra o app pode incluir ofertas em Admin → Fornecedores
              e promoções.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {promocoes.map((promo, index) => (
              <li
                key={`${promo.titulo}-${index}`}
                className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-200">{promo.titulo}</p>
                    {badgePlataforma(promo.plataforma)}
                  </div>
                  {promo.descricao && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {promo.descricao}
                    </p>
                  )}
                </div>
                <a
                  href={promo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs text-cyan-400 transition hover:bg-slate-800"
                >
                  Ver oferta
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
