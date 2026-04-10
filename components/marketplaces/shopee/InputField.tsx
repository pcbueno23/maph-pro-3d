"use client";

import { useState } from "react";

export default function InputField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  min = 0,
  max,
  step = 0.01,
  hint,
  placeholder = "0",
}: {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wide mb-1 text-neutral-500 dark:text-ink-200">
          {label}
        </label>
      )}
      <div
        className={`flex items-center rounded-xl border transition-all duration-150 overflow-hidden
        bg-slate-950/40
        ${
          focused
            ? "border-cyan-400 ring-2 ring-cyan-400/20"
            : "border-slate-800 hover:border-slate-700"
        }`}
      >
        {prefix && (
          <span className="pl-4 pr-2 text-sm font-medium select-none shrink-0 text-neutral-400 dark:text-ink-300">
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          onFocus={(e) => {
            setFocused(true);
            e.currentTarget.select();
          }}
          onBlur={() => setFocused(false)}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          className="flex-1 py-3 px-4 text-sm outline-none bg-transparent
            text-slate-100
            placeholder:text-slate-500
            [&::-webkit-inner-spin-button]:appearance-none
            [&::-webkit-outer-spin-button]:appearance-none
            [-moz-appearance:textfield]"
        />
        {suffix && (
          <span className="pr-4 pl-2 text-sm font-medium select-none shrink-0 text-neutral-400 dark:text-ink-300">
            {suffix}
          </span>
        )}
      </div>
      {hint && (
        <p className="text-xs mt-0.5 leading-relaxed text-neutral-400 dark:text-ink-300">
          {hint}
        </p>
      )}
    </div>
  );
}

