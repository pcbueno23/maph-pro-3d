"use client";

import { useRef, useState } from "react";
import { parseGcode, formatSeconds, type GcodeParseResult } from "@/lib/gcodeParser";
import { FileCode2, Upload, CheckCircle2, AlertCircle, Clock, Weight } from "lucide-react";

export default function TestGcodePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<GcodeParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function process(file: File) {
    if (!file.name.toLowerCase().endsWith(".gcode")) {
      setError("Arquivo deve ter extensão .gcode");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setFileName(file.name);
    try {
      const parsed = await parseGcode(file);
      setResult(parsed);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao ler o arquivo");
    } finally {
      setLoading(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) process(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) process(file);
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-xl space-y-6">

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileCode2 className="h-5 w-5 text-cyan-400" />
            <h1 className="text-lg font-semibold text-slate-50">
              Teste — Parser .gcode
            </h1>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
              LOCAL ONLY
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Arraste um arquivo <code className="rounded bg-slate-800 px-1">.gcode</code> para
            verificar o que o parser extrai antes de integrar na calculadora.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 transition ${
            dragging
              ? "border-cyan-400 bg-cyan-500/10"
              : "border-slate-700 bg-slate-900/50 hover:border-slate-600"
          }`}
        >
          <Upload className={`h-8 w-8 ${dragging ? "text-cyan-400" : "text-slate-500"}`} />
          <p className="text-sm text-slate-400">
            {loading ? "Lendo arquivo…" : "Clique ou arraste um arquivo .gcode"}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".gcode"
            className="hidden"
            onChange={onInputChange}
          />
        </div>

        {/* Erro */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Resultado */}
        {result && fileName && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="font-medium">{fileName}</span>
              {result.slicer && (
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">
                  {result.slicer}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Tempo */}
              <div className={`rounded-2xl border p-4 ${
                result.printTimeSeconds
                  ? "border-cyan-500/30 bg-cyan-500/10"
                  : "border-slate-700 bg-slate-900/50"
              }`}>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                  Tempo de impressão
                </div>
                <p className={`mt-2 text-2xl font-bold ${
                  result.printTimeSeconds ? "text-cyan-300" : "text-slate-600"
                }`}>
                  {result.printTimeSeconds
                    ? formatSeconds(result.printTimeSeconds)
                    : "—"}
                </p>
                {result.printTimeSeconds && (
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {result.printTimeSeconds}s brutos
                  </p>
                )}
              </div>

              {/* Peso */}
              <div className={`rounded-2xl border p-4 ${
                result.weightGrams
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-slate-700 bg-slate-900/50"
              }`}>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Weight className="h-3.5 w-3.5" />
                  Peso do filamento
                </div>
                <p className={`mt-2 text-2xl font-bold ${
                  result.weightGrams ? "text-emerald-300" : "text-slate-600"
                }`}>
                  {result.weightGrams ? `${result.weightGrams}g` : "—"}
                </p>
                {result.filamentMm && (
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {(result.filamentMm / 1000).toFixed(2)}m de filamento
                  </p>
                )}
              </div>
            </div>

            {/* Linhas brutas — útil para checar regex */}
            <details className="rounded-xl border border-slate-800 bg-slate-900/40">
              <summary className="cursor-pointer px-4 py-2.5 text-xs text-slate-400 hover:text-slate-300">
                Ver linhas brutas extraídas (debug)
              </summary>
              <div className="space-y-1 px-4 pb-3 pt-1">
                {(["timeMatch", "weightMatch", "filamentMatch"] as const).map((key) =>
                  result._raw[key] ? (
                    <div key={key} className="rounded-lg bg-slate-950 px-3 py-2">
                      <p className="text-[10px] text-slate-500 mb-0.5">{key}</p>
                      <code className="text-xs text-slate-300">{result._raw[key]}</code>
                    </div>
                  ) : null
                )}
                {!result._raw.timeMatch && !result._raw.weightMatch && (
                  <p className="text-xs text-slate-500 italic">
                    Nenhuma linha correspondente encontrada — slicer pode usar formato não suportado.
                  </p>
                )}
              </div>
            </details>

            {/* Avisos */}
            {(!result.printTimeSeconds || !result.weightGrams) && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-300 space-y-1">
                {!result.printTimeSeconds && <p>Tempo não encontrado — abra o debug acima e cole aqui a linha do seu .gcode que tem o tempo.</p>}
                {!result.weightGrams && <p>Peso não encontrado — verifique se o slicer exporta peso/filamento nos comentários.</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
