"use client";

import type { SaveProductChannel } from "@/lib/productMarketplace";

type Props = {
  open: boolean;
  title?: string;
  onCancel: () => void;
  onConfirm: (channel: SaveProductChannel) => void;
};

const OPTIONS: Array<{
  id: SaveProductChannel;
  label: string;
  hint: string;
}> = [
  {
    id: "shopee",
    label: "Shopee",
    hint: "Salva o preço sugerido para Shopee e o selo SHOPEE no card.",
  },
  {
    id: "mercado_livre",
    label: "Mercado Livre",
    hint: "Salva o preço sugerido para ML e o selo ML no card.",
  },
  {
    id: "venda_direta",
    label: "Venda direta",
    hint: "Salva o preço PIX (sem marketplace) e o selo VENDA DIRETA.",
  },
];

export function SaveProductChannelDialog({
  open,
  title = "Salvar produto — qual canal?",
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-channel-title"
        className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-xl"
      >
        <h2 id="save-channel-title" className="text-lg font-semibold text-slate-50">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          O preço e o selo no canto do card seguirão o canal escolhido.
        </p>
        <div className="mt-4 space-y-2">
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onConfirm(o.id)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-left transition hover:border-cyan-500/50 hover:bg-slate-950"
            >
              <span className="block text-sm font-semibold text-slate-100">{o.label}</span>
              <span className="mt-0.5 block text-[11px] text-slate-500">{o.hint}</span>
            </button>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
