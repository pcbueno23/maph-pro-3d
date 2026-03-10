import type { STLAnalysis } from "@/lib/stlParser";

interface STLResultsProps {
  analysis: STLAnalysis;
  fileName?: string;
  onApply: () => void;
}

export function STLResults({ analysis, fileName, onApply }: STLResultsProps) {
  const stats = [
    {
      label: "Volume",
      value: `${analysis.volumeCm3} cm³`,
      sub: `${analysis.volume.toLocaleString()} mm³`,
    },
    {
      label: "Peso estimado",
      value: `${analysis.weight} g`,
      sub: "PLA, 20% infill",
    },
    {
      label: "Tempo estimado",
      value: `${Math.floor(analysis.estimatedTime / 60)}h ${
        analysis.estimatedTime % 60
      }min`,
      sub: "Velocidade média",
    },
    {
      label: "Custo estimado",
      value: analysis.estimatedCost.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
      sub: "Material + energia",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">
            {fileName || "modelo.stl"}
          </h3>
          <p className="text-xs text-slate-400">
            {analysis.triangleCount.toLocaleString()} triângulos •{" "}
            {analysis.dimensions.x} × {analysis.dimensions.y} × {analysis.dimensions.z} mm
          </p>
        </div>
        <span className="rounded-full border border-cyan-500/50 bg-cyan-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
          Análise STL
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {s.label}
            </p>
            <p className="mt-1 text-base font-semibold text-slate-50">{s.value}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{s.sub}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onApply}
        className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400"
      >
        Usar na calculadora
      </button>
      <p className="text-center text-[11px] text-slate-500">
        Peso e tempo serão preenchidos automaticamente na calculadora.
      </p>
    </div>
  );
}

