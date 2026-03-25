/**
 * Mockup visual da calculadora do Maph Pro 3D.
 * Renderizado como HTML/CSS estático — sem dependências externas.
 * Substitua pelo screenshot real do app quando disponível.
 */
export function ProductMockup() {
  return (
    <div className="mx-auto mt-16 max-w-4xl px-4 sm:px-6 lg:px-8">
      {/* Browser chrome */}
      <div className="overflow-hidden rounded-2xl border border-slate-700/80 shadow-[0_32px_80px_-24px_rgba(6,182,212,0.25)] ring-1 ring-slate-800/60">
        {/* Top bar */}
        <div className="flex items-center gap-3 border-b border-slate-800 bg-slate-900 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-rose-500/70" />
            <span className="h-3 w-3 rounded-full bg-amber-500/70" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/70" />
          </div>
          <div className="flex flex-1 items-center justify-center">
            <span className="rounded-md border border-slate-700/80 bg-slate-800/80 px-4 py-1 text-[11px] text-slate-400">
              app.maphpro3d.com/calculator
            </span>
          </div>
        </div>

        {/* App UI */}
        <div className="grid bg-slate-950 lg:grid-cols-[280px_1fr]">
          {/* Sidebar simulada */}
          <div className="hidden border-r border-slate-800/80 bg-slate-950/80 px-3 py-5 lg:block">
            <div className="mb-5 flex items-center gap-2 px-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500" />
              <span className="text-sm font-semibold text-slate-200">Maph Pro 3D</span>
            </div>
            {[
              { label: "Dashboard", active: false },
              { label: "Calculadora", active: true },
              { label: "Produtos", active: false },
              { label: "Vendas", active: false },
              { label: "Ordens", active: false },
            ].map((item) => (
              <div
                key={item.label}
                className={`mb-1 rounded-xl px-3 py-2 text-xs ${
                  item.active
                    ? "bg-slate-900 text-cyan-400"
                    : "text-slate-500"
                }`}
              >
                {item.label}
              </div>
            ))}
          </div>

          {/* Conteúdo principal */}
          <div className="p-5 sm:p-6">
            <p className="mb-4 text-sm font-semibold text-slate-300">
              Calculadora de precificação
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Inputs */}
              <div className="space-y-3">
                {[
                  { label: "Peso do filamento (g)", value: "85g" },
                  { label: "Custo do filamento (R$/kg)", value: "R$ 80,00" },
                  { label: "Tempo de impressão (h)", value: "4h 20min" },
                  { label: "Custo de energia (R$/h)", value: "R$ 0,38" },
                  { label: "Taxa de falha (%)", value: "8%" },
                  { label: "Margem desejada (%)", value: "40%" },
                ].map((f) => (
                  <div key={f.label}>
                    <p className="mb-1 text-[10px] text-slate-500">{f.label}</p>
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs font-medium text-slate-300">
                      {f.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Resultado */}
              <div className="flex flex-col gap-3">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/8 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                    Preço sugerido — Shopee
                  </p>
                  <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-50">
                    R$ 47,90
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Lucro líquido: R$ 14,20 · Margem: 29,6%
                  </p>
                </div>
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
                    Preço mínimo (piso)
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-200">
                    R$ 34,10
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Abaixo disso → prejuízo
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Custo real", value: "R$ 19,80" },
                    { label: "Taxa marketplace", value: "R$ 13,90" },
                    { label: "Depreciação", value: "R$ 1,40" },
                    { label: "Embalagem", value: "R$ 0,80" },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="rounded-lg border border-slate-800 bg-slate-900/40 p-2.5"
                    >
                      <p className="text-[9px] text-slate-500">{m.label}</p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-300">
                        {m.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-slate-600">
        Interface real do app · dados ilustrativos
      </p>
    </div>
  );
}
