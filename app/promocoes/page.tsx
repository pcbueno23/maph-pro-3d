"use client";

import { ExternalLink, Percent } from "lucide-react";

type Plataforma = "Shopee" | "ML";

interface Promocao {
  titulo: string;
  url: string;
  descricao?: string;
  plataforma: Plataforma;
}

export default function PromocoesPage() {
  // Links de indicação – seus produtos no ML e na Shopee
  const promocoes: Promocao[] = [
    // Exemplo:
    // { titulo: "Filamento PLA 1kg", url: "https://shopee.com.br/...", descricao: "Em promoção", plataforma: "Shopee" },
    // { titulo: "Impressora 3D", url: "https://mercadolivre.com.br/...", descricao: "Frete grátis", plataforma: "ML" },
  ];

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
          Promoções
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Links de indicação dos seus produtos no Mercado Livre e na Shopee. Adicione aqui para divulgar ofertas.
        </p>
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
              Edite o arquivo app/promocoes/page.tsx e adicione itens no array promocoes (titulo, url, descricao, plataforma: &quot;Shopee&quot; ou &quot;ML&quot;).
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
                    <p className="mt-0.5 text-xs text-slate-500">{promo.descricao}</p>
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
