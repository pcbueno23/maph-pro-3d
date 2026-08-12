"use client";

import { useState } from "react";
import { Check, Save, Trash2 } from "lucide-react";

export interface PresetItem<T> {
  id: string;
  name: string;
  inputs: T;
}

interface PresetPickerProps<T> {
  presets: PresetItem<T>[];
  activeId: string | null;
  onSelect: (preset: PresetItem<T>) => void;
  /** Se o nome bater com o preset ativo, quem chama deve sobrescrever; senão, criar novo. */
  onSave: (name: string) => void;
  onDelete: (id: string) => void;
  label?: string;
}

export function PresetPicker<T>({
  presets,
  activeId,
  onSelect,
  onSave,
  onDelete,
  label = "preset",
}: PresetPickerProps<T>) {
  const [showSave, setShowSave] = useState(false);
  const [name, setName] = useState("");

  const active = presets.find((p) => p.id === activeId) ?? null;

  function confirmSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setName("");
    setShowSave(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={activeId ?? ""}
        onChange={(e) => {
          const p = presets.find((x) => x.id === e.currentTarget.value);
          if (p) onSelect(p);
        }}
        className="rounded-xl border border-slate-800 bg-slate-950/40 py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/25 focus:border-cyan-500/25"
      >
        <option value="">
          {presets.length ? `Selecionar ${label}...` : `Nenhum ${label} salvo`}
        </option>
        {presets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {active ? (
        <button
          type="button"
          onClick={() => onDelete(active.id)}
          title={`Excluir ${label} selecionado`}
          className="rounded-xl border border-slate-800 bg-slate-900/70 p-2 text-slate-400 transition hover:border-rose-500/30 hover:text-rose-300"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}

      {showSave ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            placeholder={`Nome do ${label}`}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmSave();
              if (e.key === "Escape") setShowSave(false);
            }}
            className="rounded-xl border border-slate-800 bg-slate-950/40 py-2 px-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/25 focus:border-cyan-500/25"
          />
          <button
            type="button"
            disabled={!name.trim()}
            onClick={confirmSave}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            Confirmar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setName(active?.name ?? "");
            setShowSave(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-900"
        >
          <Save className="h-3.5 w-3.5" />
          Salvar {label}
        </button>
      )}
    </div>
  );
}
