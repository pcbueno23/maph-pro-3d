"use client";

import type { SaveProductChannel } from "@/lib/productMarketplace";

type Props = {
  open: boolean;
  title?: string;
  onCancel: () => void;
  onConfirm: (channel: SaveProductChannel) => void;
  /** Quais canais mostrar (e em que ordem). Default: comportamento original (sem TikTok). */
  channels?: SaveProductChannel[];
  /** Canais mostrados mas desabilitados (ex.: sem preset configurado). */
  unavailableChannels?: SaveProductChannel[];
  /** Imagem principal opcional, definida junto com o salvamento (só funciona logado). */
  imageFile?: File | null;
  onImageChange?: (file: File | null) => void;
  /** Se false, esconde o seletor de imagem (ex.: usuário não logado). */
  showImagePicker?: boolean;
};

const ALL_OPTIONS: Record<SaveProductChannel, { label: string; hint: string }> = {
  shopee: {
    label: "Shopee",
    hint: "Salva o preço sugerido para Shopee e o selo SHOPEE no card.",
  },
  mercado_livre: {
    label: "Mercado Livre",
    hint: "Salva o preço sugerido para ML e o selo ML no card.",
  },
  tiktok: {
    label: "TikTok Shop",
    hint: "Salva o preço sugerido para TikTok Shop e o selo TIKTOK SHOP no card.",
  },
  venda_direta: {
    label: "Venda direta",
    hint: "Salva o preço PIX (sem marketplace) e o selo VENDA DIRETA.",
  },
};

const DEFAULT_CHANNELS: SaveProductChannel[] = ["shopee", "mercado_livre", "venda_direta"];

export function SaveProductChannelDialog({
  open,
  title = "Salvar produto — qual canal?",
  onCancel,
  onConfirm,
  channels = DEFAULT_CHANNELS,
  unavailableChannels = [],
  imageFile,
  onImageChange,
  showImagePicker = false,
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

        {showImagePicker && onImageChange && (
          <div className="mt-4">
            <label className="mb-1 block text-xs text-slate-400">Imagem principal (opcional)</label>
            <div className="flex min-h-[80px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/40 px-3 text-center text-xs text-slate-500">
              {imageFile ? imageFile.name : "Nenhuma imagem selecionada"}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800">
                Selecionar imagem
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onImageChange(e.target.files?.[0] ?? null)}
                />
              </label>
              {imageFile ? (
                <button
                  type="button"
                  onClick={() => onImageChange(null)}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                >
                  Remover
                </button>
              ) : null}
            </div>
          </div>
        )}

        <div className="mt-4 space-y-2">
          {channels.map((id) => {
            const o = ALL_OPTIONS[id];
            const disabled = unavailableChannels.includes(id);
            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                onClick={() => onConfirm(id)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                  disabled
                    ? "cursor-not-allowed border-slate-800 bg-slate-950/30 opacity-50"
                    : "border-slate-700 bg-slate-950/60 hover:border-cyan-500/50 hover:bg-slate-950"
                }`}
              >
                <span className="block text-sm font-semibold text-slate-100">{o.label}</span>
                <span className="mt-0.5 block text-[11px] text-slate-500">
                  {disabled ? "Configure um preset nessa aba primeiro." : o.hint}
                </span>
              </button>
            );
          })}
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
