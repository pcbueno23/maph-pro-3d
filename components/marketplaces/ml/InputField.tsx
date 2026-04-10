"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  prefix?: string;
  suffix?: string;
  children?: ReactNode;
  className?: string;
};

export default function InputField({
  label,
  hint,
  prefix,
  suffix,
  children,
  className = "",
  ...props
}: Props) {
  if (children) {
    return (
      <div className={className}>
        <label className="block text-xs font-semibold text-neutral-500 dark:text-ink-200 uppercase tracking-wide mb-1.5">
          {label}
        </label>
        {children}
        {hint && (
          <p className="text-xs text-neutral-400 dark:text-ink-300 mt-1">{hint}</p>
        )}
      </div>
    );
  }
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-neutral-500 dark:text-ink-200 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400 dark:text-ink-300 pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          {...props}
          onFocus={(e) => {
            e.currentTarget.select();
            props.onFocus?.(e);
          }}
          className={`w-full rounded-xl border text-sm font-medium transition-all
            bg-slate-950/40 border-slate-800
            text-slate-100
            placeholder:text-slate-500
            focus:outline-none focus:ring-2 focus:ring-ml-500/25 focus:border-ml-500/40
            ${prefix ? "pl-8" : "pl-3"} ${suffix ? "pr-8" : "pr-3"} py-2.5`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400 dark:text-ink-300 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {hint && (
        <p className="text-xs text-neutral-400 dark:text-ink-300 mt-1">{hint}</p>
      )}
    </div>
  );
}

