"use client";

import { useController, type Path, type UseFormReturn } from "react-hook-form";
import { useState, type ComponentProps } from "react";
import type { CalculatorFormValues } from "@/types";

type Props = Omit<
  ComponentProps<"input">,
  "name" | "value" | "onChange" | "type" | "form"
> & {
  form: UseFormReturn<CalculatorFormValues>;
  name: Path<CalculatorFormValues>;
  /** Inteiros sem decimais (ex.: peças por impressão). */
  integerOnly?: boolean;
  /** Quantidade de casas decimais para números (padrão: 2). */
  decimals?: number;
  /** Campo vazio ao sair vira `undefined` (ex.: preço opcional). */
  emptyAsUndefined?: boolean;
  /** Valor ao sair com campo vazio (ex.: unidades por impressão mín. 1). */
  emptyFallback?: number;
};

function parseDecimalInput(raw: string): number {
  const t = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (t === "" || t === "-" || t === ".") return NaN;
  return parseFloat(t);
}

function parseIntInput(raw: string): number {
  const t = raw.trim().replace(/\s/g, "");
  if (t === "") return NaN;
  return parseInt(t, 10);
}

function roundTo(n: number, decimals: number) {
  if (!Number.isFinite(n)) return 0;
  const d = Math.max(0, Math.min(8, Math.round(decimals)));
  const p = 10 ** d;
  return Math.round(n * p) / p;
}

export function FormNumericInput({
  form,
  name,
  integerOnly,
  decimals = 2,
  emptyAsUndefined,
  emptyFallback,
  className,
  ...rest
}: Props) {
  const { onBlur: onBlurProp, onFocus: onFocusProp, ...inputRest } = rest;
  const { field } = useController({ name, control: form.control });
  const [draft, setDraft] = useState<string | null>(null);

  const raw = field.value as number | undefined;
  const display =
    draft !== null
      ? draft
      : raw === undefined || raw === null || (typeof raw === "number" && Number.isNaN(raw))
        ? ""
        : String(raw);

  return (
    <input
      {...inputRest}
      type="text"
      inputMode={integerOnly ? "numeric" : "decimal"}
      autoComplete="off"
      spellCheck={false}
      className={className}
      value={display}
      onFocus={(e) => {
        const cur =
          raw === undefined || raw === null || (typeof raw === "number" && Number.isNaN(raw))
            ? ""
            : String(raw);
        setDraft(cur);
        onFocusProp?.(e);
      }}
      onChange={(e) => {
        const v = e.target.value;
        if (integerOnly) {
          if (!/^\d*$/.test(v)) return;
        } else if (v !== "" && !/^-?\d*(?:[.,]\d*)?$/.test(v)) {
          return;
        }
        setDraft(v);
        if (v.trim() === "" || v === "-" || v === ".") {
          return;
        }
        const n = integerOnly ? parseIntInput(v) : parseDecimalInput(v);
        if (Number.isFinite(n)) {
          field.onChange(integerOnly ? n : roundTo(n, decimals));
        }
      }}
      onBlur={(e) => {
        const rawStr = e.currentTarget.value;
        setDraft(null);
        const empty =
          rawStr.trim() === "" || rawStr.trim() === "-" || rawStr.trim() === ".";

        if (empty) {
          if (emptyAsUndefined) {
            field.onChange(undefined);
          } else if (emptyFallback !== undefined) {
            field.onChange(emptyFallback);
          } else {
            field.onChange(0);
          }
          field.onBlur();
          onBlurProp?.(e);
          return;
        }

        const n = integerOnly ? parseIntInput(rawStr) : parseDecimalInput(rawStr);
        if (Number.isFinite(n)) {
          field.onChange(integerOnly ? n : roundTo(n, decimals));
        } else if (emptyFallback !== undefined) {
          field.onChange(emptyFallback);
        } else {
          field.onChange(0);
        }
        field.onBlur();
        onBlurProp?.(e);
      }}
    />
  );
}
