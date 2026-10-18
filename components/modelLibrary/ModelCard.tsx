"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Loader2, Copy, Check } from "lucide-react";
import type { ModelFileEntry } from "@/lib/modelLibrary/types";
import { generateThumbnail } from "@/lib/modelLibrary/thumbnail";
import { getCachedThumbnail, setCachedThumbnail, thumbnailCacheKey } from "@/lib/modelLibrary/thumbnailCache";

function fmtSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Caminho relativo DENTRO da pasta conectada (com \, estilo Windows) — o navegador
 * nunca entrega o caminho absoluto no disco (trava de segurança), então isso é o
 * mais específico que dá pra copiar. Colado na BARRA DE ENDEREÇO do Explorer
 * (não na busca) enquanto já está dentro da pasta raiz conectada, abre o arquivo
 * direto — Explorer resolve caminho relativo a partir da pasta atual. */
function relativePath(entry: ModelFileEntry): string {
  return [...entry.path, entry.name].join("\\");
}

/** Só gera/lê a miniatura quando o card entra perto da tela — gerar os ~900 de
 * uma vez travaria o navegador. `rootMargin` generoso pra já ir adiantando
 * enquanto o usuário rola. */
export function ModelCard({ entry }: { entry: ModelFileEntry }) {
  const ref = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "failed">("idle");
  const [copied, setCopied] = useState(false);

  async function handleCopyPath(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(relativePath(entry));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard indisponível — sem feedback, mas não quebra a tela
    }
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        setStatus("loading");

        const key = thumbnailCacheKey(entry.name, entry.size, entry.lastModified);
        (async () => {
          const cached = await getCachedThumbnail(key);
          if (cached) {
            setThumb(cached);
            setStatus("done");
            return;
          }
          try {
            const file = await entry.handle.getFile();
            const dataUrl = await generateThumbnail(file, entry.ext);
            if (dataUrl) {
              setThumb(dataUrl);
              setStatus("done");
              void setCachedThumbnail(key, dataUrl);
            } else {
              setStatus("failed");
            }
          } catch {
            setStatus("failed");
          }
        })();
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      className="glass-panel flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/50 transition hover:border-cyan-500/30"
    >
      <div className="relative flex aspect-square items-center justify-center bg-slate-900/60">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={entry.name} className="h-full w-full object-contain" draggable={false} />
        ) : status === "failed" ? (
          <div className="flex flex-col items-center gap-1 text-slate-600">
            <Box className="h-9 w-9" />
            <span className="text-[10px]">sem pré-visualização</span>
          </div>
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
        )}
        <span className="absolute left-2 top-2 rounded-full border border-slate-700 bg-slate-950/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-300">
          .{entry.ext}
        </span>
        <button
          type="button"
          onClick={(e) => void handleCopyPath(e)}
          title={`Copiar caminho: ${relativePath(entry)}`}
          className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border text-[11px] transition ${
            copied
              ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
              : "border-slate-700 bg-slate-950/80 text-slate-400 hover:border-cyan-500/40 hover:text-cyan-300"
          }`}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="space-y-0.5 p-2.5">
        <p className="truncate text-xs font-semibold text-slate-100" title={entry.name}>
          {entry.name}
        </p>
        <p
          className="truncate text-[10px] text-slate-500"
          title={entry.path.length > 0 ? entry.path.join(" / ") : entry.folderLabel}
        >
          {entry.path.length > 0 ? entry.path.join(" / ") : entry.folderLabel}
        </p>
        <p className="text-[10px] text-slate-600">{fmtSize(entry.size)}</p>
      </div>
    </div>
  );
}
