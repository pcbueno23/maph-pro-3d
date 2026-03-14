"use client";

import { ExternalLink, Store } from "lucide-react";

export default function FornecedoresPage() {
  // Lista de parceiros – no futuro preencher com links de fornecedores
  const parceiros: { nome: string; url?: string; descricao?: string }[] = [
    {
      nome: "Voolt3D",
      url: "https://voolt3d.com.br/",
      descricao: "Filamentos e insumos 3D – maior fabricante nacional, PLA, PETG, ABS, resinas e impressoras.",
    },  
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
          Fornecedores
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Parceiros da plataforma. Em breve, links para fornecedores que fizerem parceria com o Maph Pro 3D.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
        {parceiros.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/80 text-slate-500">
              <Store className="h-6 w-6" />
            </div>
            <p className="text-sm text-slate-400">
              Nenhum fornecedor parceiro cadastrado ainda.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Os links dos parceiros aparecerão aqui quando forem ativados.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {parceiros.map((p) => (
              <li
                key={p.nome}
                className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-200">{p.nome}</p>
                  {p.descricao && (
                    <p className="text-xs text-slate-500">{p.descricao}</p>
                  )}
                </div>
                {p.url && (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs text-cyan-400 transition hover:bg-slate-800"
                  >
                    Acessar
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
