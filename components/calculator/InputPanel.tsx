import { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import type { CalculatorFormValues, Printer, SupplyItem } from "@/types";
import { FormNumericInput } from "@/components/calculator/FormNumericInput";
import { useSettingsStore } from "@/store/settingsStore";
import { useAuthStore } from "@/store/authStore";
import { listPrinters, listSupplies } from "@/lib/supabaseProduction";

// Afrouxamos levemente o tipo genérico aqui para evitar
// incompatibilidades entre versões de TypeScript/react-hook-form
// em ambientes diferentes (local vs Vercel), mantendo a forma principal.
interface Props {
  form: UseFormReturn<CalculatorFormValues, any, any>;
  /** Oculta marketplace, margem, frete estimado (ex.: tela só de custos de impressão + margem certa). */
  hidePricingSection?: boolean;
  /** Quando o usuário limpa o filamento, mantém um id válido para o schema (placeholder interno). */
  materialSupplyFallbackId?: string;
}

export function InputPanel({
  form,
  hidePricingSection = false,
  materialSupplyFallbackId,
}: Props) {
  const {
    register,
    setValue,
    formState: { errors },
  } = form;
  const selectedFilamentId = form.watch("material.supplyId") ?? "";
  const filamentSelectValue =
    materialSupplyFallbackId && selectedFilamentId === materialSupplyFallbackId
      ? ""
      : selectedFilamentId;
  const currentFilamentPerKg = Number(form.watch("material.pricePerKg") ?? 0);

  const { settings } = useSettingsStore();
  const user = useAuthStore((s) => s.user);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [filaments, setFilaments] = useState<SupplyItem[]>([]);

  const selectedFilament = selectedFilamentId
    ? filaments.find((s) => s.id === selectedFilamentId) ?? null
    : null;
  const presetFilamentPerKg = (() => {
    if (!selectedFilament) return null;
    const unit = (selectedFilament.unit ?? "").toLowerCase();
    const perKg =
      unit === "g"
        ? (selectedFilament.unitCost ?? 0) * 1000
        : (selectedFilament.unitCost ?? 0);
    return Number(perKg);
  })();
  const filamentPresetMismatch =
    presetFilamentPerKg != null &&
    Number.isFinite(presetFilamentPerKg) &&
    Number.isFinite(currentFilamentPerKg) &&
    Math.abs(presetFilamentPerKg - currentFilamentPerKg) > 0.01;

  const selectedPrinterId = form.watch("time.printerId") ?? "";
  const totalHoursRaw = form.watch("time.hours") ?? 0;
  const totalHoursNonNeg = Math.max(0, totalHoursRaw);
  const durationHWhole = Math.floor(totalHoursNonNeg);
  const durationMPart = Math.min(
    59,
    Math.max(0, Math.round((totalHoursNonNeg % 1) * 60)),
  );
  const [durationHourDraft, setDurationHourDraft] = useState<string | null>(null);
  const [durationMinDraft, setDurationMinDraft] = useState<string | null>(null);
  const [cep, setCep] = useState("");
  const [isFetchingCep, setIsFetchingCep] = useState(false);

  useEffect(() => {
    // carrega impressoras e insumos (filamentos) do Supabase
    if (!user) {
      setPrinters([]);
      setFilaments([]);
      return;
    }
    let alive = true;
    Promise.all([listPrinters(user.id), listSupplies(user.id)])
      .then(([printerItems, supplyItems]) => {
        if (!alive) return;
        setPrinters(printerItems);
        setFilaments(supplyItems.filter((s) => s.category === "filament"));
      })
      .catch(() => {
        if (!alive) return;
        setPrinters([]);
        setFilaments([]);
      });
    return () => {
      alive = false;
    };
  }, [user?.id]);

  // Quando a lista de impressoras carrega: definir padrão (se não tiver seleção) e sempre
  // preencher potência, custo, vida útil e tarifa da impressora selecionada para o cálculo.
  useEffect(() => {
    if (printers.length === 0) return;
    const defaultId = settings.printer?.defaultPrinterId ?? "";
    const current = form.getValues("time.printerId") ?? "";
    const idToUse = current || defaultId;
    if (!idToUse) return;
    const p = printers.find((x) => x.id === idToUse);
    if (!p) return;
    if (!current && defaultId) {
      setValue("time.printerId", defaultId, { shouldDirty: false });
    }
    setValue("time.powerW", Number(p.powerW ?? 0), { shouldDirty: false });
    setValue("costs.printerCost", Number(p.purchaseValue ?? 0), { shouldDirty: false });
    setValue("costs.lifetimeHours", Number(p.usefulLifeHours ?? 0) || 1, { shouldDirty: false });
    if (Number.isFinite(Number(p.energyRateBrlKwh))) {
      setValue("costs.kwhPrice", Number(p.energyRateBrlKwh ?? 0), { shouldDirty: false });
    }
    setValue("costs.annualMaintenance", Number(p.annualMaintenance ?? 0), { shouldDirty: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printers, settings.printer?.defaultPrinterId]);

  // Sempre que o usuário trocar a impressora (ou o preset atualizar), aplicar dados dela.
  useEffect(() => {
    if (!selectedPrinterId) return;
    if (printers.length === 0) return;
    const p = printers.find((x) => x.id === selectedPrinterId);
    if (!p) return;
    setValue("time.powerW", Number(p.powerW ?? 0), { shouldDirty: true });
    setValue("costs.printerCost", Number(p.purchaseValue ?? 0), { shouldDirty: true });
    setValue("costs.lifetimeHours", Number(p.usefulLifeHours ?? 0) || 1, { shouldDirty: true });
    if (Number.isFinite(Number(p.energyRateBrlKwh))) {
      setValue("costs.kwhPrice", Number(p.energyRateBrlKwh ?? 0), { shouldDirty: true });
    }
    setValue("costs.annualMaintenance", Number(p.annualMaintenance ?? 0), { shouldDirty: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPrinterId, printers]);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <h2 className="text-sm font-semibold text-slate-100">
        Parâmetros da impressão
      </h2>
      <input type="hidden" {...register("time.printerId")} />

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
                Filamento (preset de insumo) *
              </label>
              <select
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                value={filamentSelectValue}
                onChange={(e) => {
                  const id = e.target.value;
                  const sup = filaments.find((s) => s.id === id);
                  if (!sup) {
                    setValue(
                      "material.supplyId",
                      materialSupplyFallbackId ?? "",
                      { shouldDirty: true },
                    );
                    return;
                  }
                  // A calculadora trabalha com R$/kg. Em /insumos (filamento) podemos ter:
                  // - unit "g" com custo por grama (R$/g)
                  // - unit "kg" com custo por kg (R$/kg)
                  const perKg =
                    (sup.unit ?? "").toLowerCase() === "g"
                      ? (sup.unitCost ?? 0) * 1000
                      : (sup.unitCost ?? 0);
                  setValue("material.supplyId", id, { shouldDirty: true });
                  setValue("material.pricePerKg", perKg, { shouldDirty: true });
                }}
              >
                <option value="">Selecione um filamento</option>
                {filaments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ·{" "}
                    {(() => {
                      const unit = (s.unit ?? "").toLowerCase();
                      const perKg =
                        unit === "g" ? (s.unitCost ?? 0) * 1000 : (s.unitCost ?? 0);
                      return `${perKg.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}/kg`;
                    })()}
                  </option>
                ))}
              </select>
              {selectedFilament ? (
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                  <span className="text-slate-500">
                    Preset:{" "}
                    <span className="font-medium text-slate-200">
                      {(presetFilamentPerKg ?? 0).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                      /kg
                    </span>
                  </span>
                  <span className="text-slate-500">
                    Usando no cálculo:{" "}
                    <span className={filamentPresetMismatch ? "font-semibold text-amber-200" : "font-medium text-slate-200"}>
                      {(Number.isFinite(currentFilamentPerKg) ? currentFilamentPerKg : 0).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                      /kg
                    </span>
                  </span>
                  {filamentPresetMismatch ? (
                    <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-200">
                      Divergente
                    </span>
                  ) : null}
                </div>
              ) : null}
              {errors.material?.supplyId && (
                <p className="mt-1 text-xs text-rose-400">
                  {errors.material.supplyId.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Peso da peça (g)
              </label>
              <FormNumericInput
                form={form}
                name="material.weight"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
              {errors.material?.weight && (
                <p className="mt-1 text-xs text-rose-400">
                  {errors.material.weight.message}
                </p>
              )}
              <div className="mt-2">
                <label className="mb-1 block text-xs text-slate-300">
                  Peças por impressão (na mesma mesa)
                </label>
                <FormNumericInput
                  form={form}
                  name="time.unitsPerBatch"
                  integerOnly
                  emptyFallback={1}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Peso da placa (g) – opcional
              </label>
              <FormNumericInput
                form={form}
                name="material.plateWeight"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
              {errors.material?.plateWeight && (
                <p className="mt-1 text-xs text-rose-400">
                  {errors.material.plateWeight.message}
                </p>
              )}
              <p className="mt-0.5 text-[11px] text-slate-500">
                Use o peso total da mesa do fatiador quando imprimir várias peças juntas.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Custo do filamento (R$/kg)
              </label>
              <FormNumericInput
                form={form}
                name="material.pricePerKg"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>

          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            Tempo & energia
          </p>
          <div className="space-y-2 text-sm">
            <div className="space-y-1.5">
              <label className="mb-1 block text-xs text-slate-300">
                Duração (h/min)
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-16 min-w-0 bg-transparent text-sm text-slate-100 outline-none"
                  value={
                    durationHourDraft !== null
                      ? durationHourDraft
                      : String(durationHWhole)
                  }
                  onFocus={() => setDurationHourDraft(String(durationHWhole))}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!/^\d*$/.test(v)) return;
                    setDurationHourDraft(v);
                    if (v.trim() === "") return;
                    const h = Math.max(0, parseInt(v, 10) || 0);
                    const total = form.getValues("time.hours") ?? 0;
                    const m = Math.min(
                      59,
                      Math.max(
                        0,
                        Math.round((Math.max(0, total) % 1) * 60),
                      ),
                    );
                    setValue("time.hours", h + m / 60, { shouldDirty: true });
                  }}
                  onBlur={(e) => {
                    const raw = e.currentTarget.value.trim();
                    setDurationHourDraft(null);
                    const h =
                      raw === "" ? 0 : Math.max(0, parseInt(raw, 10) || 0);
                    const total = form.getValues("time.hours") ?? 0;
                    const m = Math.min(
                      59,
                      Math.max(
                        0,
                        Math.round((Math.max(0, total) % 1) * 60),
                      ),
                    );
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
                  value={
                    durationMinDraft !== null
                      ? durationMinDraft
                      : String(durationMPart)
                  }
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
                    const m =
                      raw === ""
                        ? 0
                        : Math.min(59, Math.max(0, parseInt(raw, 10) || 0));
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
                  setValue("time.printerId", value || undefined, { shouldDirty: true });
                  if (value === "") return;
                  const p = printers.find((x) => x.id === value);
                  if (!p) return;
                  // Preenche campos da calculadora a partir da impressora cadastrada
                  setValue("time.powerW", Number(p.powerW ?? 0), { shouldDirty: true });
                  setValue("costs.printerCost", Number(p.purchaseValue ?? 0), { shouldDirty: true });
                  setValue("costs.lifetimeHours", Number(p.usefulLifeHours ?? 0) || 1, { shouldDirty: true });
                  if (Number.isFinite(Number(p.energyRateBrlKwh))) {
                    setValue("costs.kwhPrice", Number(p.energyRateBrlKwh ?? 0), { shouldDirty: true });
                  }
                  setValue(
                    "costs.annualMaintenance",
                    Number(p.annualMaintenance ?? 0),
                    { shouldDirty: true },
                  );
                  setValue(
                    "costs.yearlyPrintHours",
                    settings.defaults.yearlyPrintHours ?? 1000,
                    { shouldDirty: true },
                  );
                }}
              >
                <option value="">Selecionar</option>
                {printers.length > 0 ? (
                  <optgroup label="Impressoras cadastradas">
                    {printers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.powerW ? ` · ${Number(p.powerW).toFixed(0)}W` : ""}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
              <FormNumericInput
                form={form}
                name="time.powerW"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>


          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Energia (R$/kWh)
              </label>
              <div className="space-y-1.5">
                <FormNumericInput
                  form={form}
                  name="costs.kwhPrice"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
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
                      if (v.length > 5) {
                        v = `${v.slice(0, 5)}-${v.slice(5)}`;
                      }
                      setCep(v);
                    }}
                  />
                  <button
                    type="button"
                    disabled={isFetchingCep}
                    className="whitespace-nowrap rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-300 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={async () => {
                      const numericCep = cep.replace(/\D/g, "");
                      if (numericCep.length !== 8) {
                        return;
                      }
                      setIsFetchingCep(true);
                      try {
                        const resp = await fetch(`https://viacep.com.br/ws/${numericCep}/json/`);
                        const data = await resp.json();
                        if (!data || data.erro || !data.uf) {
                          return;
                        }
                        const stateRates: Record<string, number> = {
                          AC: 0.88,
                          AL: 0.84,
                          AP: 0.82,
                          AM: 0.94,
                          BA: 0.89,
                          CE: 0.92,
                          DF: 0.76,
                          ES: 0.74,
                          GO: 0.81,
                          MA: 0.86,
                          MT: 0.9,
                          MS: 0.88,
                          MG: 0.82,
                          PA: 0.96,
                          PB: 0.83,
                          PR: 0.72,
                          PE: 0.85,
                          PI: 0.87,
                          RJ: 1.05,
                          RN: 0.84,
                          RS: 0.8,
                          RO: 0.85,
                          RR: 0.78,
                          SC: 0.68,
                          SP: 0.78,
                          SE: 0.81,
                          TO: 0.86,
                        };
                        const uf: string = data.uf;
                        const rate = stateRates[uf] ?? 0.85;
                        setValue("costs.kwhPrice", rate, { shouldDirty: true });
                      } catch {
                        // falha silenciosa; usuário pode digitar manualmente
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
              <label className="mb-1 block text-xs text-slate-300">
                Embalagem (R$)
              </label>
              <FormNumericInput
                form={form}
                name="costs.packaging"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Custo da impressora (R$)
              </label>
              <FormNumericInput
                form={form}
                name="costs.printerCost"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Vida útil (h)
              </label>
              <FormNumericInput
                form={form}
                name="costs.lifetimeHours"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>
        </div>
      </div>

      <details className="rounded-xl border border-slate-800 bg-slate-950/40">
        <summary className="cursor-pointer list-none px-3 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
          Ajustes Avançados <span className="ml-2 text-[11px] font-normal text-slate-500">(opcional)</span>
        </summary>
        <div className="px-3 pb-3">
          <div className="mt-1 grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Taxa de falha (%){" "}
                <span className="text-slate-500" title="Aumenta o custo real: custo/(1 - falha).">
                  (?)
                </span>
              </label>
              <FormNumericInput
                form={form}
                name="advanced.taxaFalha"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Desconto real (%){" "}
                <span className="text-slate-500" title="Aplica desconto no preço final e recalcula taxas/imposto.">
                  (?)
                </span>
              </label>
              <FormNumericInput
                form={form}
                name="advanced.descontoPercentual"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="md:col-span-1">
              <label className="mb-1 block text-xs text-slate-300">
                Mão de obra{" "}
                <span className="text-slate-500" title="Somada ao custo real do produto.">
                  (?)
                </span>
              </label>
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
              <FormNumericInput
                form={form}
                name="advanced.maoDeObraValor"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Tempo manual (min){" "}
                <span className="text-slate-500" title="Usado apenas no modo Por hora.">
                  (?)
                </span>
              </label>
              <FormNumericInput
                form={form}
                name="advanced.tempoManualMin"
                integerOnly
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>
        </div>
      </details>

      {!hidePricingSection ? (
      <>
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
            <FormNumericInput
              form={form}
              name="pricing.desiredMargin"
              className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
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
            <FormNumericInput
              form={form}
              name="pricing.comparePrice"
              emptyAsUndefined
              placeholder="Ex: 49,90"
              className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
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
            <FormNumericInput
              form={form}
              name="pricing.discountPercent"
              placeholder="0"
              className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
            <p className="mt-0.5 text-[11px] text-slate-500">
              Preço a anunciar calculado para manter margem
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-3">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-400/95">
          Venda direta ao consumidor (sem marketplace)
        </p>
        <div className="mt-2 grid gap-3 md:grid-cols-2 md:items-end">
          <div>
            <label className="mb-1 block text-xs text-slate-300">
              Margem alvo — PIX / consumidor final (%)
            </label>
            <FormNumericInput
              form={form}
              name="pricing.directSaleDesiredMargin"
              className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Usada nos preços <strong className="text-slate-400">Direto</strong> (sem comissão de
            Shopee/Mercado Livre). O valor inicial segue a margem de marketplace +{" "}
            {settings.defaults.directMarginExtraPoints ?? 10} p.p. (ajustável em{" "}
            <span className="text-slate-400">Configurações</span>).
          </p>
        </div>
      </div>

      <div className="grid items-start gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs text-slate-300">
            Frete estimado (R$)
          </label>
          <FormNumericInput
            form={form}
            name="pricing.shippingEstimate"
            className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-300">
            Imposto sobre venda (%)
          </label>
          <FormNumericInput
            form={form}
            name="pricing.taxPercent"
            className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-300">
            Taxa cartão direto (%)
          </label>
          <FormNumericInput
            form={form}
            name="pricing.cardFeePercent"
            className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
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
      </>
      ) : null}
    </div>
  );
}
