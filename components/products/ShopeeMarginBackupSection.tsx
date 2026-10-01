"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calculator, ChevronDown, ExternalLink, FileSpreadsheet } from "lucide-react";
import { fetchMarginRows } from "@/lib/supabaseMarginSheet";
import type { MarginRow } from "@/lib/shopeeMarginSheet";
import { useCalculatorStore } from "@/store/calculatorStore";

/** "Bandeja Canelada Oval c/ Pés (Kit Tamanhos Variados) — GRANDE 22x11x2 cm (todas as cores)" */
function fullRowName(r: MarginRow): string {
  return r.variacao ? `${r.produto} — ${r.variacao}` : r.produto;
}

function formatBRL(v: number | null) {
  return v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Seção read-only com os produtos importados da planilha "Preço e Margem Shopee" —
 * fica separada da tabela principal (que alimenta custo/kits/ordens) porque é só
 * um backup de referência: custo/embalagem/preços vêm da planilha, não daqui. */
export function ShopeeMarginBackupSection({ userId }: { userId: string | undefined }) {
  const router = useRouter();
  const setPendingProductName = useCalculatorStore((s) => s.setPendingProductName);
  const [rows, setRows] = useState<MarginRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  function handleCalcularCusto(r: MarginRow) {
    setPendingProductName(fullRowName(r));
    router.push("/calculadoras/custo");
  }

  useEffect(() => {
    if (!userId) {
      setRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchMarginRows(userId).then((r) => {
      if (cancelled) return;
      setRows(r);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading || rows.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left"
      >
        <span className="inline-flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-violet-300" />
          <span className="text-sm font-semibold text-slate-100">
            Produtos da planilha Shopee ({rows.length})
          </span>
          <span className="text-[11px] text-slate-500">
            — backup de referência, não entra em custo/kits/ordens
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <>
          <p className="px-2 pb-2 text-[11px] text-slate-500">
            Importados em{" "}
            <Link href="/margem-shopee" className="text-cyan-300 hover:text-cyan-200">
              Preço e Margem Shopee
            </Link>
            . Editar custo/embalagem lá, não aqui — servem de backup caso você troque de planilha.
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead className="text-[10px] uppercase tracking-[0.1em] text-slate-500">
                <tr className="border-b border-slate-800">
                  <th className="px-2 py-2 text-left">Produto</th>
                  <th className="px-2 py-2 text-left">Variação</th>
                  <th className="px-2 py-2 text-right">Preço cadastro</th>
                  <th className="px-2 py-2 text-right">Custo produção</th>
                  <th className="px-2 py-2 text-right">Embalagem+outros</th>
                  <th className="px-2 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {rows.map((r) => (
                  <tr key={r.id ?? `${r.produto}-${r.variacao}`} className="hover:bg-slate-900/40">
                    <td className="max-w-[260px] px-2 py-2">
                      <span className="inline-flex max-w-full items-center gap-1">
                        <span className="truncate text-slate-200" title={r.produto}>
                          {r.produto}
                        </span>
                        {r.link ? (
                          <a
                            href={r.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir anúncio na Shopee"
                            className="shrink-0 text-cyan-400 hover:text-cyan-300"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null}
                      </span>
                    </td>
                    <td className="max-w-[200px] truncate px-2 py-2 text-slate-400" title={r.variacao}>
                      {r.variacao || "—"}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-slate-300">
                      {formatBRL(r.precoCadastro)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-slate-300">
                      {formatBRL(r.custoProducao)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-slate-300">
                      {formatBRL(r.embalagemOutros)}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleCalcularCusto(r)}
                        title="Abre a calculadora de custo 3D com o nome deste produto já preenchido"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:border-cyan-500/40 hover:text-cyan-200"
                      >
                        <Calculator className="h-3.5 w-3.5" />
                        Calcular custo
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
