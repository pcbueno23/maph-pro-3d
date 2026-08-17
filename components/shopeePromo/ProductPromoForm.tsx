"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import InputField from "@/components/marketplaces/shopee/InputField";
import DiscountField from "@/components/marketplaces/shopee/DiscountField";
import { calcularPrecoShopee, formatBRL, formatPct, type ShopeeInputs } from "@/lib/engines/shopee/engine";
import type { Product } from "@/types";

export default function ProductPromoForm({
  product,
  onChange,
}: {
  product: Product;
  onChange: (patch: Partial<Product>) => void;
}) {
  const custo = product.totalCost ?? 0;
  const precoCadastro = product.shopeePromoPrecoCadastro ?? 0;
  const descontoPercent = product.shopeePromoDescontoPercent ?? 0;
  const cupomPercent = product.shopeePromoCupomPercent ?? 0;
  const cupomMaxRS = product.shopeePromoCupomMaxRS ?? 0;
  const ofertaPercent = product.shopeePromoOfertaRelampagoPercent ?? 0;

  // Mesma cadeia de referência usada na calculadora Shopee: cadastro -> desconto normal
  // -> oferta relâmpago (substitui o desconto, não acumula) -> cupom (em cima do ativo).
  const chain = useMemo(() => {
    const p0 = precoCadastro;
    const comDesconto = p0 * (1 - descontoPercent / 100);
    const precoAtivo = ofertaPercent > 0 ? p0 * (1 - ofertaPercent / 100) : comDesconto;
    return { p0, comDesconto, precoAtivo };
  }, [precoCadastro, descontoPercent, ofertaPercent]);

  function sugerirComCalculadora() {
    const inputs: ShopeeInputs = {
      fullCustoUnidade: custo,
      valorCompra: 0,
      custoEnvio: 0,
      isKit: false,
      kitQtd: 1,
      modo: "margem",
      metaLucroPercent: 20,
      precoTravado: 0,
      metaLucroRS: 0,
      markupPercent: 70,
      tributacaoPercent: 0,
      roasAlvo: 0,
      promocaoPercent: descontoPercent,
      cupomLojaPercent: cupomPercent,
      cupomMaxRS,
      ofertaRelampagoPercent: ofertaPercent,
      campanhasDestaque: false,
      shopeeAcelera: "none",
      tipoVendedor: "cnpj",
      altaVolume: false,
      estimativaVendas: 0,
      referenciaPrecoMercado: 0,
    };
    const result = calcularPrecoShopee(inputs);
    onChange({ shopeePromoPrecoCadastro: result.precoCadastroSugerido });
  }

  const resumo =
    [
      precoCadastro > 0 ? `Cadastro: ${formatBRL(precoCadastro)}` : null,
      descontoPercent > 0 ? `Desconto: ${formatPct(descontoPercent)}` : null,
      cupomPercent > 0
        ? `Cupom: ${formatPct(cupomPercent)}${cupomMaxRS > 0 ? ` (até ${formatBRL(cupomMaxRS)})` : ""}`
        : null,
      ofertaPercent > 0 ? `Oferta relâmpago: ${formatPct(ofertaPercent)}` : null,
    ]
      .filter(Boolean)
      .join(" · ") || "Nenhum valor definido ainda";

  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(resumo);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">Custo do produto: {formatBRL(custo)}</p>
        <button
          type="button"
          onClick={sugerirComCalculadora}
          disabled={custo <= 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Sparkles className="h-3.5 w-3.5" /> Sugerir cadastro (margem 20%)
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InputField
          label="Preço de cadastro"
          value={precoCadastro}
          onChange={(v) => onChange({ shopeePromoPrecoCadastro: v })}
          prefix="R$"
        />
        <div className="hidden sm:block" />

        <DiscountField
          label="Desconto"
          percent={descontoPercent}
          onPercentChange={(v) => onChange({ shopeePromoDescontoPercent: v })}
          referencePrice={chain.p0}
        />
        <DiscountField
          label="Oferta relâmpago"
          percent={ofertaPercent}
          onPercentChange={(v) => onChange({ shopeePromoOfertaRelampagoPercent: v })}
          referencePrice={chain.p0}
          ceilingPrice={chain.comDesconto}
          ceilingHint="do desconto normal (não acumula, substitui)"
        />

        <DiscountField
          label="Cupom loja"
          percent={cupomPercent}
          onPercentChange={(v) => onChange({ shopeePromoCupomPercent: v })}
          referencePrice={chain.precoAtivo}
        />
        <InputField
          label="Teto do cupom"
          value={cupomMaxRS}
          onChange={(v) => onChange({ shopeePromoCupomMaxRS: v })}
          prefix="R$"
          placeholder="Sem limite"
        />
      </div>

      <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
        <p className="min-w-0 truncate text-xs text-slate-300">{resumo}</p>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-300 transition hover:bg-slate-800"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}
