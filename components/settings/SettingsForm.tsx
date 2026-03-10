"use client";

import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { settingsSchema, type SettingsValues } from "@/types";
import { useSettingsStore } from "@/store/settingsStore";

export function SettingsForm() {
  const { settings, updateSettings } = useSettingsStore();

  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema) as Resolver<SettingsValues>,
    defaultValues: settings,
  });

  const customPresets = form.watch("printer.customPresets") ?? [];

  const onSubmit = (values: SettingsValues) => {
    const normalized = settingsSchema.parse(values);
    updateSettings(normalized);
    form.reset(normalized);
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm"
    >
      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Padrões de custos
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Custo do kWh (R$)
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                {...form.register("defaults.kwhPrice", { valueAsNumber: true })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Custo da impressora (R$)
              </label>
              <input
                type="number"
                step="10"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                {...form.register("defaults.printerCost", {
                  valueAsNumber: true,
                })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Valor residual (R$)
              </label>
              <input
                type="number"
                step="10"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                {...form.register("defaults.residualValue", {
                  valueAsNumber: true,
                })}
              />
              <p className="mt-0.5 text-[11px] text-slate-500">
                Valor estimado de revenda ao fim da vida útil.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Vida útil da impressora (h)
              </label>
              <input
                type="number"
                step="10"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                {...form.register("defaults.lifetimeHours", {
                  valueAsNumber: true,
                })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Infraestrutura anual (R$/ano)
              </label>
              <input
                type="number"
                step="10"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                {...form.register("defaults.infrastructureYear", {
                  valueAsNumber: true,
                })}
              />
              <p className="mt-0.5 text-[11px] text-slate-500">
                Ex.: aluguel, internet, ferramentas, etc.
              </p>
            </div>
            {/* Manutenção anual e horas/ano agora são configuradas por preset personalizado */}
            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Embalagem padrão (R$)
              </label>
              <input
                type="number"
                step="0.1"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                {...form.register("defaults.packaging", {
                  valueAsNumber: true,
                })}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Frete padrão estimado (R$)
              </label>
              <input
                type="number"
                step="0.1"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                {...form.register("defaults.shippingEstimateDefault", {
                  valueAsNumber: true,
                })}
              />
              <p className="mt-0.5 text-[11px] text-slate-500">
                Valor usado como frete padrão na calculadora.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
                  {...form.register("defaults.shopeeFreeShippingDefault")}
                />
                Frete Grátis (Shopee) por padrão na calculadora
              </label>
              <p className="text-[11px] text-slate-500">
                Quando ativo, a Shopee usa 20% de comissão automaticamente.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Preferências
          </h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Moeda padrão
              </label>
              <select
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                {...form.register("currency")}
              >
                <option value="BRL">Real (BRL)</option>
                <option value="USD">Dólar (USD)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Margem padrão (%)
              </label>
              <input
                type="number"
                step="0.5"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                {...form.register("defaults.desiredMargin", {
                  valueAsNumber: true,
                })}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Base de imposto
              </label>
              <select
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                {...form.register("defaults.taxMode")}
              >
                <option value="gross">Receita bruta (preço cheio)</option>
                <option value="net_marketplace">
                  Receita líquida marketplace (preço - comissão)
                </option>
              </select>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Em “líquida”, o imposto é calculado sobre preço menos comissão do
                marketplace.
              </p>
            </div>

            <div className="space-y-2">
              <label className="mb-1 block text-xs text-slate-300">
                Preset padrão (personalizado)
              </label>
              <select
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                {...form.register("printer.presetId")}
              >
                <option value="">Selecionar manualmente</option>
                {customPresets.map((p) => (
                  <option key={p.id} value={`custom:${p.id}`}>
                    {p.name} · {p.averagePowerW}W
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                A lista contém apenas presets personalizados.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Presets personalizados
              </p>

              <div className="grid gap-2 md:grid-cols-3">
                <input
                  type="text"
                  placeholder="Nome do preset (ex.: Minha A1)"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  {...form.register("printer.customName")}
                />
                <input
                  type="number"
                  step="1"
                  placeholder="W médios"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  {...form.register("printer.customPowerW", {
                    valueAsNumber: true,
                  })}
                />
                <input
                  type="number"
                  step="10"
                  placeholder="Valor da impressora (R$)"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  {...form.register("printer.customPrinterCost", {
                    valueAsNumber: true,
                  })}
                />
                <input
                  type="number"
                  step="10"
                  placeholder="Vida útil (h)"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  {...form.register("printer.customLifetimeHours", {
                    valueAsNumber: true,
                  })}
                />
                <input
                  type="number"
                  step="10"
                  placeholder="Manutenção anual (R$/ano)"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  {...form.register("printer.customAnnualMaintenance", {
                    valueAsNumber: true,
                  })}
                />
                <input
                  type="number"
                  step="10"
                  placeholder="Horas impressas/ano (h/ano)"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  {...form.register("printer.customYearlyPrintHours", {
                    valueAsNumber: true,
                  })}
                />
                <button
                  type="button"
                  className="md:col-span-3 rounded-xl bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-900"
                  onClick={() => {
                    const name =
                      (form.getValues("printer.customName") || "").trim();
                    const w = form.getValues("printer.customPowerW");
                    if (!name || !w || !Number.isFinite(w) || w <= 0) return;
                    const printerCost = form.getValues("printer.customPrinterCost") ?? 0;
                    const lifetimeHours = form.getValues("printer.customLifetimeHours") ?? 0;
                    if (!lifetimeHours || lifetimeHours <= 0) return;
                    const annualMaintenance =
                      form.getValues("printer.customAnnualMaintenance") ??
                      form.getValues("defaults.annualMaintenance") ??
                      0;
                    const yearlyPrintHours =
                      form.getValues("printer.customYearlyPrintHours") ??
                      form.getValues("defaults.yearlyPrintHours") ??
                      1000;
                    const id =
                      typeof crypto !== "undefined" && crypto.randomUUID
                        ? crypto.randomUUID()
                        : `cp_${Date.now()}`;
                    form.setValue(
                      "printer.customPresets",
                      [
                        ...customPresets,
                        {
                          id,
                          name,
                          averagePowerW: w,
                          printerCost,
                          lifetimeHours,
                          annualMaintenance,
                          yearlyPrintHours,
                        },
                      ],
                      { shouldDirty: true },
                    );
                    form.setValue("printer.customName", "", {
                      shouldDirty: true,
                    });
                    form.setValue("printer.customPowerW", undefined, {
                      shouldDirty: true,
                    });
                    form.setValue("printer.customPrinterCost", undefined, {
                      shouldDirty: true,
                    });
                    form.setValue("printer.customLifetimeHours", undefined, {
                      shouldDirty: true,
                    });
                    form.setValue("printer.customAnnualMaintenance", undefined, {
                      shouldDirty: true,
                    });
                    form.setValue("printer.customYearlyPrintHours", undefined, {
                      shouldDirty: true,
                    });
                  }}
                >
                  Adicionar
                </button>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                {customPresets.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Você ainda não tem presets personalizados.
                  </p>
                ) : (
                  <ul className="space-y-2 text-xs">
                    {customPresets.map((p, idx) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-100">
                            {p.name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {p.averagePowerW}W · R$ {p.printerCost} · {p.lifetimeHours}h · Manut. R$ {p.annualMaintenance}/ano · {p.yearlyPrintHours}h/ano
                          </p>
                        </div>
                        <button
                          type="button"
                          className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/15"
                          onClick={() => {
                            const next = customPresets.filter(
                              (x) => x.id !== p.id,
                            );
                            form.setValue("printer.customPresets", next, {
                              shouldDirty: true,
                            });
                            const current = form.getValues("printer.presetId");
                            if (current === `custom:${p.id}`) {
                              form.setValue("printer.presetId", "", {
                                shouldDirty: true,
                              });
                            }
                          }}
                        >
                          Remover
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400"
        >
          Salvar configurações
        </button>
      </div>
    </form>
  );
}

