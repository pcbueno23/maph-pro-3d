"use client";

import { useState } from "react";

export function FaqAccordion({
  items,
}: {
  items: Array<{ q: string; a: string }>;
}) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <ul className="mt-12 space-y-4">
      {items.map((item, idx) => {
        const isOpen = open === idx;
        return (
          <li
            key={item.q}
            className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80"
          >
            <button
              type="button"
              onClick={() => setOpen((prev) => (prev === idx ? null : idx))}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              aria-expanded={isOpen}
            >
              <span className="font-semibold text-slate-100">{item.q}</span>
              <span
                className={[
                  "grid h-8 w-8 place-items-center rounded-lg border text-sm transition",
                  isOpen
                    ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                    : "border-slate-800 bg-slate-900/60 text-slate-300",
                ].join(" ")}
                aria-hidden
              >
                {isOpen ? "–" : "+"}
              </span>
            </button>

            <div
              className={[
                "grid transition-[grid-template-rows] duration-300 ease-out",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              ].join(" ")}
            >
              <div className="overflow-hidden px-5 pb-5 text-sm leading-relaxed text-slate-400">
                {item.a}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

