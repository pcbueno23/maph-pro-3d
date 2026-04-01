"use client";

import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import type { CalculatorFormValues } from "@/types";
import { FormNumericInput } from "@/components/calculator/FormNumericInput";
import { PRINTER_PRESETS, DEFAULT_MARKETPLACE_FEES } from "@/lib/constants";

interface Props {
  form: UseFormReturn<CalculatorFormValues, any, any>;
}

const INPUT_CLS =
  "w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500";

export function PublicInputPanel({ form }: Props) {
  const { register, setValue, formState: { errors } } = form;

  const totalHoursRaw = form.watch("time.hours") ?? 0;
  const totalHoursNonNeg = Math.max(0, totalHoursRaw);
  const durationHWhole = Math.floor(totalHoursNonNeg);
  const durationMPart = Math.min(59, Math.max(0, Math.round((totalHoursNonNeg % 1) * 60)));
  const [durationHourDraft, setDurationHourDraft] = useState<string | null>(null);
  const [durationMinDraft, setDurationMinDraft] = useState<string | null>(null);

  const [cep, setCep] = useState("");
  const [isFetchingCep, setIsFetchingCep] = useState(false);

  const personType = form.watch("pricing.personType");
  const marketplace = form.watch("pricing.marketplace");

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <h2 className="text-sm font-semibold text-slate-100">Parâmetros da impressão</h2>

      {/* Nome */}
      <div>
        <label className="mb-1 block text-xs text-slate-300">Nome do item</label>
        <input
          type="text"
          placeholder="Ex: Suporte de celular, Organizador de bits"
          className={INPUT_CLS}
          {...register("productName")}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Material */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Material</p>
          <div className="space-y-2 text-sm">

            <div>
              <label className="mb-1 block text-xs text-slate-300">Tipo de filamento</label>
              <select className={INPUT_CLS} {...register("material.type")}>
                <option value="PLA">PLA</option>
                <option value="ABS">ABS</option>
                <option value="PETG">PETG</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-300">Custo do filamento (R$/kg)</label>
              <FormNumericInput form={form} name="material.pricePerKg" className={INPUT_CLS} />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-300">Peso da peça (g) *</label>
              <FormNumericInput form={form} name="material.weight" className={INPUT_CLS} />
              {errors.material?.weight && (
                <p className="mt-1 text-xs text-rose-400">{errors.material.weight.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-300">Peças por impressão</label>
              <FormNumericInput
                form={form}
                name="time.unitsPerBatch"
                integerOnly
                emptyFallback={1}
                className={INPUT_CLS}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Peso da placa (g){" "}
                <span className="text-slate-500">– opcional, quando imprime várias peças juntas</span>
              </label>
              <FormNumericInput form={form} name="material.plateWeight" className={INPUT_CLS} />
            </div>
          </div>
        </div>

        {/* Tempo & Energia */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Tempo & energia</p>
          <div className="space-y-2 text-sm">

            {/* Duração h/min */}
            <div className="space-y-1.5">
              <label className="mb-1 block text-xs text-slate-300">Duração (h/min)</label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-16 min-w-0 bg-transparent text-sm text-slate-100 outline-none"
                  value={durationHourDraft !== null ? durationHourDraft : String(durationHWhole)}
                  onFocus={() => setDurationHourDraft(String(durationHWhole))}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!/^\d*$/.test(v)) return;
                    setDurationHourDraft(v);
                    if (v.trim() === "") return;
                    const h = Math.max(0, parseInt(v, 10) || 0);
                    const total = form.getValues("time.hours") ?? 0;
                    const m = Math.min(59, Math.max(0, Math.round((Math.max(0, total) % 1) * 60)));
                    setValue("time.hours", h + m / 60, { shouldDirty: true });
                  }}
                  onBlur={(e) => {
                    const raw = e.currentTarget.value.trim();
                    setDurationHourDraft(null);
                    const h = raw === "" ? 0 : Math.max(0, parseInt(raw, 10) || 0);
                    const total = form.getValues("time.hours") ?? 0;
                    const m = Math.min(59, Math.max(0, Math.round((Math.max(0, total) % 1) * 60)));
                    setValue("time.hours", h + m / 60, { shouldDirty: true });
                  }}
                />
                <span className="text-xs text-slate-400">h</span>
                <div className="h-4 w-px bg-slate-800" />
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-16 min-w-0 bg-transparent text-sm text-slate-100 outline-none"
                  value={durationMinDraft !== null ? durationMinDraft : String(durationMPart)}
                  onFocus={() => setDurationMinDraft(String(durationMPart))}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!/^\d*$/.test(v)) return;
                    setDurationMinDraft(v);
                    if (v.trim() === "") return;
                    const m = Math.min(59, Math.max(0, parseInt(v, 10) || 0));
                    const total = form.getValues("time.hours") ?? 0;
                    const h = Math.floor(Math.max(0, total));
                    setValue("time.hours", h + m / 60, { shouldDirty: true });
                  }}
                  onBlur={(e) => {
                    const raw = e.currentTarget.value.trim();
                    setDurationMinDraft(null);
                    const m = raw === "" ? 0 : Math.min(59, Math.max(0, parseInt(raw, 10) || 0));
                    const total = form.getValues("time.hours") ?? 0;
                    const h = Math.floor(Math.max(0, total));
                    setValue("time.hours", h + m / 60, { shouldDirty: true });
                  }}
                />
                <span className="text-xs text-slate-400">min</span>
              </div>
            </div>

            {/* Modelo de impressora (só potência) */}
            <div className="space-y-1.5">
              <label className="mb-1 block text-xs text-slate-300">Modelo de impressora</label>
              <select
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                defaultValue=""
                onChange={(e) => {
                  const preset = PRINTER_PRESETS.find((p) => p.id === e.target.value);
                  if (preset) {
                    setValue("time.powerW", preset.averagePowerW, { shouldDirty: true });
                  }
                }}
              >
                <option value="">Selecionar modelo (preenche potência)</option>
                {PRINTER_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.averagePowerW}W médio
                  </option>
                ))}
              </select>
              <FormNumericInput
                form={form}
                name="time.powerW"
                className={INPUT_CLS}
              />
              <p className="text-[11px] text-slate-500">Potência média (W) — pode editar manualmente</p>
            </div>
          </div>
        </div>
      </div>

      {/* Custos */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <label className="mb-1 block text-xs text-slate-300">Energia (R$/kWh)</label>
          <div className="space-y-1.5">
            <FormNumericInput form={form} name="costs.kwhPrice" className={INPUT_CLS} />
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={9}
                placeholder="CEP para sugerir tarifa"
                className="w-full rounded-lg border border-slate-900 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                value={cep}
                onChange={(e) => {
                  let v = e.target.value.replace(/\D/g, "");
                  if (v.length > 8) v = v.slice(0, 8);
                  if (v.length > 5) v = `${v.slice(0, 5)}-${v.slice(5)}`;
                  setCep(v);
                }}
              />
              <button
                type="button"
                disabled={isFetchingCep}
                className="whitespace-nowrap rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-300 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={async () => {
                  const numericCep = cep.replace(/\D/g, "");
                  if (numericCep.length !== 8) return;
                  setIsFetchingCep(true);
                  try {
                    const resp = await fetch(`https://viacep.com.br/ws/${numericCep}/json/`);
                    const data = await resp.json();
                    if (!data || data.erro || !data.uf) return;
                    const stateRates: Record<string, number> = {
                      AC: 0.88, AL: 0.84, AP: 0.82, AM: 0.94, BA: 0.89, CE: 0.92,
                      DF: 0.76, ES: 0.74, GO: 0.81, MA: 0.86, MT: 0.9, MS: 0.88,
                      MG: 0.82, PA: 0.96, PB: 0.83, PR: 0.72, PE: 0.85, PI: 0.87,
                      RJ: 1.05, RN: 0.84, RS: 0.8, RO: 0.85, RR: 0.78, SC: 0.68,
                      SP: 0.78, SE: 0.81, TO: 0.86,
                    };
                    setValue("costs.kwhPrice", stateRates[data.uf] ?? 0.85, { shouldDirty: true });
                  } catch {
                    // falha silenciosa
                  } finally {
                    setIsFetchingCep(false);
                  }
                }}
              >
                {isFetchingCep ? "Buscando..." : "Usar CEP"}
              </button>
            </div>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-300">Embalagem (R$)</label>
          <FormNumericInput form={form} name="costs.packaging" className={INPUT_CLS} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <label className="mb-1 block text-xs text-slate-300">Custo da impressora (R$)</label>
          <FormNumericInput form={form} name="costs.printerCost" className={INPUT_CLS} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-300">Vida útil (h)</label>
          <FormNumericInput form={form} name="costs.lifetimeHours" className={INPUT_CLS} />
        </div>
      </div>

      {/* Ajustes opcionais */}
      <details className="rounded-xl border border-slate-800 bg-slate-950/40">
        <summary className="cursor-pointer list-none px-3 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
          Ajustes avançados <span className="ml-2 text-[11px] font-normal text-slate-500">(opcional)</span>
        </summary>
        <div className="px-3 pb-3">
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-300">Manutenção anual (R$)</label>
              <FormNumericInput form={form} name="costs.annualMaintenance" className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">Infraestrutura anual (R$)</label>
              <FormNumericInput form={form} name="costs.infrastructureYear" className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">Horas/ano de impressão</label>
              <FormNumericInput form={form} name="costs.yearlyPrintHours" className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">Taxa de falha (%)</label>
              <FormNumericInput form={form} name="advanced.taxaFalha" className={INPUT_CLS} />
            </div>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="md:col-span-1">
              <label className="mb-1 block text-xs text-slate-300">Mão de obra</label>
              <div className="flex gap-2 text-xs">
                <label className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-slate-200">
                  <input type="radio" value="fixo" {...register("advanced.maoDeObraTipo")} />
                  Fixo/peça
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-slate-200">
                  <input type="radio" value="hora" {...register("advanced.maoDeObraTipo")} />
                  Por hora
                </label>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">Valor (R$)</label>
              <FormNumericInput form={form} name="advanced.maoDeObraValor" className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">Tempo manual (min)</label>
              <FormNumericInput form={form} name="advanced.tempoManualMin" integerOnly className={INPUT_CLS} />
            </div>
          </div>
        </div>
      </details>

      {/* Precificação */}
      <div className="grid items-start gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2 text-sm">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Tipo de conta</p>
          <select
            className={INPUT_CLS}
            {...register("pricing.personType", {
              onChange: (e) => {
                const pt = e.target.value as "CPF" | "CNPJ";
                const mp = form.getValues("pricing.marketplace") as "Shopee" | "Mercado Livre" | "Amazon";
                const fee = DEFAULT_MARKETPLACE_FEES[mp]?.[pt] ?? 18;
                setValue("pricing.marketplaceFee", fee, { shouldDirty: true });
              },
            })}
          >
            <option value="CPF">Pessoa Física (CPF)</option>
            <option value="CNPJ">Pessoa Jurídica (CNPJ)</option>
          </select>
          <p className="text-[11px] text-slate-500">Afeta as taxas da Shopee e Mercado Livre</p>
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Marketplace</p>
          <select
            className={INPUT_CLS}
            {...register("pricing.marketplace", {
              onChange: (e) => {
                const mp = e.target.value as "Shopee" | "Mercado Livre" | "Amazon";
                const pt = form.getValues("pricing.personType") as "CPF" | "CNPJ";
                const fee = DEFAULT_MARKETPLACE_FEES[mp]?.[pt] ?? 18;
                setValue("pricing.marketplaceFee", fee, { shouldDirty: true });
              },
            })}
          >
            <option value="Shopee">Shopee</option>
            <option value="Mercado Livre">Mercado Livre</option>
          </select>
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Margem desejada</p>
          <FormNumericInput form={form} name="pricing.desiredMargin" className={INPUT_CLS} />
          <p className="text-[11px] text-slate-500">% de margem alvo sobre o preço de venda</p>
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Frete estimado (R$)</p>
          <FormNumericInput form={form} name="pricing.shippingEstimate" className={INPUT_CLS} />
          <p className="text-[11px] text-slate-500">Custo de envio embutido no preço</p>
        </div>
      </div>
    </div>
  );
}
