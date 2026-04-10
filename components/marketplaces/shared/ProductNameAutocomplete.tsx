"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@/types";
import { useProductsStore } from "@/store/productsStore";

type Props = {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (next: string) => void;
  onPick: (product: Product) => void;
  className?: string;
};

export default function ProductNameAutocomplete({
  label,
  placeholder,
  value,
  onChange,
  onPick,
  className = "",
}: Props) {
  const { products, hydrateFromStorage } = useProductsStore();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 12);
    return products
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 12);
  }, [products, query]);

  return (
    <div ref={rootRef} className={className}>
      <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
        {label}
      </label>

      <div className="relative">
        <input
          value={value}
          onChange={(e) => {
            const next = e.currentTarget.value;
            onChange(next);
            setQuery(next);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-3 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/25 focus:border-cyan-500/25"
        />

        {open && products.length > 0 && (
          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-xl">
            {items.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400">
                Nenhum produto encontrado.
              </div>
            ) : (
              <ul className="max-h-72 overflow-auto">
                {items.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onPick(p);
                        setOpen(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-slate-900/60 transition flex items-center justify-between gap-3"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-100">
                          {p.name}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          Custo produção:{" "}
                          {typeof p.totalCost === "number"
                            ? p.totalCost.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })
                            : "—"}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">
                        {p.marketplace}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

