"use client";

import { useMemo, useState } from "react";

type Tab = {
  id: string;
  label: string;
  title: string;
  description: string;
  bullets: string[];
};

export function FeatureTabs({ tabs }: { tabs: Tab[] }) {
  const safeTabs = useMemo(() => (tabs.length ? tabs : []), [tabs]);
  const [activeId, setActiveId] = useState<string>(safeTabs[0]?.id ?? "");
  const active = safeTabs.find((t) => t.id === activeId) ?? safeTabs[0];

  if (!active) return null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 sm:p-6">
      <div className="flex flex-wrap gap-2">
        {safeTabs.map((t) => {
          const isActive = t.id === active.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveId(t.id)}
              className={[
                "rounded-full px-4 py-2 text-xs font-semibold transition",
                isActive
                  ? "bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 shadow-lg shadow-cyan-500/15"
                  : "border border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-600 hover:bg-slate-900",
              ].join(" ")}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* key força remontagem para reiniciar a transição ao trocar de aba */}
      <div
        key={active.id}
        className="mt-6 grid gap-6 animate-[fadeSlideIn_0.2s_ease-out] lg:grid-cols-2 lg:items-start"
        style={{ animationFillMode: "both" }}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
            {active.label}
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-50">{active.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            {active.description}
          </p>
        </div>

        <ul className="grid gap-3">
          {active.bullets.map((b) => (
            <li
              key={b}
              className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-300"
            >
              <span className="mr-2 text-cyan-300">✓</span>
              {b}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

