import { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import type { CalculatorFormValues } from "@/types";
import { useSettingsStore } from "@/store/settingsStore";
import { useSuppliesStore } from "@/store/suppliesStore";

// Afrouxamos levemente o tipo genérico aqui para evitar
// incompatibilidades entre versões de TypeScript/react-hook-form
// em ambientes diferentes (local vs Vercel), mantendo a forma principal.
interface Props {
  form: UseFormReturn<CalculatorFormValues, any, any>;
}

export function InputPanel({ form }: Props) {
  const {
    register,
    setValue,
    formState: { errors },
  } = form;

  const { settings } = useSettingsStore();
  const customPresets = settings.printer?.customPresets ?? [];
  const { supplies, hydrateFromStorage } = useSuppliesStore();

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  const defaultPresetValue =
    settings.printer?.presetId ??
    "";
  const [selectedPrinterId, setSelectedPrinterId] = useState(defaultPresetValue);

  useEffect(() => {
    setSelectedPrinterId(defaultPresetValue);
  }, [defaultPresetValue]);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <h2 className="text-sm font-semibold text-slate-100">
        Parâmetros da impressão
      </h2>

      <div>
        <label className="mb-1 block text-xs text-slate-300">
          Nome do item
        </label>
        <input
          type="text"
          placeholder="Ex: Suporte de celular, Organizador de bits"
          className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          {...register("productName")}
        />
        <p className="mt-0.5 text-[11px] text-slate-500">
          Nome usado ao salvar na lista de produtos
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            Material
          </p>
          <div className="space-y-2 text-sm">
            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Filamento (preset de insumo)
              </label>
              <select
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) return;
                  const sup = supplies.find((s) => s.id === id);
                  if (!sup) return;
                  setValue("material.pricePerKg", sup.unitCost, { shouldDirty: true });
                }}
                defaultValue=""
              >
                <option value="">Selecionar (opcional)</option>
                {supplies
                  .filter((s) => s.kind === "filament")
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.unitCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/
                      {s.unit}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Peso da peça (g)
              </label>
              <input
                type="number"
                step="0.1"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                {...register("material.weight", { valueAsNumber: true })}
              />
              {errors.material?.weight && (
                <p className="mt-1 text-xs text-rose-400">
                  {errors.material.weight.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Custo do filamento (R$/kg)
              </label>
              <input
                type="number"
                step="0.1"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                {...register("material.pricePerKg", { valueAsNumber: true })}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Tipo de material
              </label>
              <select
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                {...register("material.type")}
              >
                <option value="PLA">PLA</option>
                <option value="ABS">ABS</option>
                <option value="PETG">PETG</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            Tempo & energia
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="space-y-1.5">
              <label className="mb-1 block text-xs text-slate-300">
                Duração (h/min)
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2">
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="w-16 bg-transparent text-sm text-slate-100 outline-none"
                  value={Math.floor(Math.max(0, form.watch("time.hours") ?? 0))}
                  onChange={(e) => {
                    const h = Math.max(0, parseInt(e.target.value, 10) || 0);
                    const total = form.getValues("time.hours") ?? 0;
                    const m = Math.min(
                      59,
                      Math.max(0, Math.round((total % 1) * 60)),
                    );
                    setValue("time.hours", h + m / 60, { shouldDirty: true });
                  }}
                />
                <span className="text-xs text-slate-400">h</span>
                <div className="h-4 w-px bg-slate-800" />
                <input
                  type="number"
                  min={0}
                  max={59}
                  step={1}
                  className="w-16 bg-transparent text-sm text-slate-100 outline-none"
                  value={Math.min(
                    59,
                    Math.max(
                      0,
                      Math.round(((form.watch("time.hours") ?? 0) % 1) * 60),
                    ),
                  )}
                  onChange={(e) => {
                    const m = Math.min(
                      59,
                      Math.max(0, parseInt(e.target.value, 10) || 0),
                    );
                    const total = form.getValues("time.hours") ?? 0;
                    const h = Math.floor(Math.max(0, total));
                    setValue("time.hours", h + m / 60, { shouldDirty: true });
                  }}
                />
                <span className="text-xs text-slate-400">min</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="mb-1 block text-xs text-slate-300">
                Impressora / potência média
              </label>
              <select
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                value={selectedPrinterId}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedPrinterId(value);
                  if (value === "") return;
                  if (value.startsWith("custom:")) {
                    const id = value.slice("custom:".length);
                    const preset = customPresets.find((p) => p.id === id);
                    if (preset) {
                      setValue("time.powerW", preset.averagePowerW, {
                        shouldDirty: true,
                      });
                      setValue("costs.printerCost", preset.printerCost, {
                        shouldDirty: true,
                      });
                      setValue("costs.lifetimeHours", preset.lifetimeHours, {
                        shouldDirty: true,
                      });
                      setValue(
                        "costs.annualMaintenance",
                        preset.annualMaintenance ?? settings.defaults.annualMaintenance ?? 0,
                        { shouldDirty: true },
                      );
                      setValue(
                        "costs.yearlyPrintHours",
                        preset.yearlyPrintHours ?? settings.defaults.yearlyPrintHours ?? 1000,
                        { shouldDirty: true },
                      );
                    }
                    return;
                  }
                }}
              >
                <option value="">Selecionar</option>
                {customPresets.length > 0 && (
                  <optgroup label="Personalizados">
                    {customPresets.map((p) => (
                      <option key={p.id} value={`custom:${p.id}`}>
                        {p.name} · {p.averagePowerW}W
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <input
                type="number"
                step="1"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                value={form.watch("time.powerW") ?? ""}
                onChange={(e) => {
                  const v = e.target.value === "" ? 0 : Number(e.target.value);
                  setValue("time.powerW", Number.isFinite(v) ? v : 0, {
                    shouldDirty: true,
                  });
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Energia (R$/kWh)
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                {...register("costs.kwhPrice", { valueAsNumber: true })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Embalagem (R$)
              </label>
              <input
                type="number"
                step="0.1"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                {...register("costs.packaging", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Custo da impressora (R$)
              </label>
              <input
                type="number"
                step="10"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                {...register("costs.printerCost", { valueAsNumber: true })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Vida útil (h)
              </label>
              <input
                type="number"
                step="10"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                {...register("costs.lifetimeHours", { valueAsNumber: true })}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2 text-sm">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            Tipo de conta (CPF/CNPJ)
          </p>
          <div>
            <select
              className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              {...register("pricing.personType")}
            >
              <option value="CPF">Pessoa Física (CPF)</option>
              <option value="CNPJ">Pessoa Jurídica (CNPJ)</option>
            </select>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Vale para Shopee e Mercado Livre (taxa fixa e comissão)
            </p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            Margem desejada
          </p>
          <div>
            <label className="mb-1 block text-xs text-slate-300">
              Margem alvo (%)
            </label>
            <input
              type="number"
              step="0.1"
              className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              {...register("pricing.desiredMargin", { valueAsNumber: true })}
            />
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            Comparar preço
          </p>
          <div>
            <label className="mb-1 block text-xs text-slate-300">
              Preço desejado (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min={0}
              placeholder="Ex: 49,90"
              className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              {...register("pricing.comparePrice", { valueAsNumber: true })}
            />
            <p className="mt-0.5 text-[11px] text-slate-500">
              Quanto você ganharia vendendo a esse preço
            </p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            Promoção
          </p>
          <div>
            <label className="mb-1 block text-xs text-slate-300">
              Desconto promo (%)
            </label>
            <input
              type="number"
              step="1"
              min={0}
              max={99}
              placeholder="0"
              className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              {...register("pricing.discountPercent", { valueAsNumber: true })}
            />
            <p className="mt-0.5 text-[11px] text-slate-500">
              Preço a anunciar calculado para manter margem
            </p>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs text-slate-300">
            Frete estimado (R$)
          </label>
          <input
            type="number"
            step="0.01"
            min={0}
            className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            {...register("pricing.shippingEstimate", { valueAsNumber: true })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-300">
            Imposto sobre venda (%)
          </label>
          <input
            type="number"
            step="0.1"
            min={0}
            max={100}
            className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            {...register("pricing.taxPercent", { valueAsNumber: true })}
          />
        </div>
            <div className="flex flex-col justify-end">
          <label className="mb-1 flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
              {...register("pricing.freeShipping")}
            />
            Frete Grátis (Shopee)
          </label>
          <p className="text-[11px] text-slate-500">
            Taxa 20% quando ativo
          </p>
        </div>
            <div className="flex flex-col justify-end">
              <label className="mb-1 flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
                  {...register("pricing.mlClassic")}
                />
                Mercado Livre Clássico (13% + R$ 6,50)
              </label>
              <p className="text-[11px] text-slate-500">
                Desmarcado = Premium 16% com taxa fixa por faixa.
              </p>
            </div>
      </div>
    </div>
  );
}
