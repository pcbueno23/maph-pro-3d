"use client";

import type { Resolver } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { settingsSchema, type SettingsValues } from "@/types";
import { useSettingsStore } from "@/store/settingsStore";
import { useAuthStore } from "@/store/authStore";
import { saveUserSettings } from "@/lib/supabaseUserData";

export function SettingsForm() {
  const router = useRouter();
  const { settings, updateSettings } = useSettingsStore();
  const user = useAuthStore((s) => s.user);

  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema) as Resolver<SettingsValues>,
    defaultValues: settings,
  });

  // Impressoras agora são gerenciadas em /impressoras (Supabase)

  const onSubmit = async (values: SettingsValues) => {
    const normalized = settingsSchema.parse(values);
    updateSettings(normalized);
    form.reset(normalized);
    if (user) {
      // Importante: SettingsForm não edita o bloco "printer".
      // Precisamos persistir a configuração completa (inclui impressora padrão da calculadora).
      const merged = useSettingsStore.getState().settings;
      try {
        await saveUserSettings(user.id, merged);
      } catch {
        /* mantém fluxo: store já atualizado */
      }
    }
    router.push("/dashboard");
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

            <div>
              <label className="mb-1 block text-xs text-slate-300">
                Taxa cartão direto (%)
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                {...form.register("defaults.cardFeePercent", {
                  valueAsNumber: true,
                })}
              />
              <p className="mt-0.5 text-[11px] text-slate-500">
                Usada para sugerir preço em venda direta no crédito.
              </p>
            </div>

            <div className="md:col-span-2 mt-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Presets de comissão – Shopee e Mercado Livre
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-300">
                    Shopee – comissão base (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    {...form.register("defaults.shopeeBaseCommission", {
                      valueAsNumber: true,
                    })}
                  />
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Comissão padrão quando o frete grátis da Shopee não está ativo.
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-300">
                    Shopee – comissão com frete grátis (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    {...form.register("defaults.shopeeFreeShippingCommission", {
                      valueAsNumber: true,
                    })}
                  />
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Usada quando você marca “Frete Grátis (Shopee)” na calculadora.
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-300">
                    Mercado Livre – anúncio Clássico (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    {...form.register("defaults.mlClassicCommission", {
                      valueAsNumber: true,
                    })}
                  />
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Usada quando “Mercado Livre Clássico” está marcado na calculadora.
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-300">
                    Mercado Livre – anúncio Premium (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    {...form.register("defaults.mlPremiumCommission", {
                      valueAsNumber: true,
                    })}
                  />
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Usada quando “Mercado Livre Clássico” está desmarcado (Premium).
                  </p>
                </div>
              </div>
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
                Extra na margem venda direta (p.p.){" "}
                <span
                  className="text-slate-500"
                  title="Somado à margem padrão para pré-preencher a margem de venda direta (sem marketplace). Ex.: 30% + 10 p.p. = 40%."
                >
                  (?)
                </span>
              </label>
              <input
                type="number"
                step="1"
                min={0}
                max={50}
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                {...form.register("defaults.directMarginExtraPoints", {
                  valueAsNumber: true,
                })}
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Usado na calculadora principal e na margem certa ao sugerir margem maior para PIX /
                consumidor final.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <p className="text-xs text-slate-300">
                Impressoras e potência agora são gerenciadas em <strong>/impressoras</strong>.
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Na calculadora, selecione a impressora cadastrada para preencher potência, tarifa e depreciação.
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Ajustes avançados (calculadora)
        </h2>
        <p className="text-[11px] text-slate-500">
          Valores iniciais para cada nova simulação na calculadora (taxa de falha, desconto real e mão de obra).
          Você ainda pode alterar na hora no painel da calculadora.
        </p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-slate-300">
              Taxa de falha (%){" "}
              <span className="text-slate-500" title="Aumenta o custo real: custo ÷ (1 − falha).">
                (?)
              </span>
            </label>
            <input
              type="number"
              step="0.1"
              min={0}
              max={99.9}
              className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              {...form.register("advanced.taxaFalha", { valueAsNumber: true })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-300">
              Desconto real (%){" "}
              <span
                className="text-slate-500"
                title="Desconto que o cliente costuma receber; o preço sugerido compensa para manter a margem."
              >
                (?)
              </span>
            </label>
            <input
              type="number"
              step="0.1"
              min={0}
              max={99}
              className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              {...form.register("advanced.descontoPercentual", { valueAsNumber: true })}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-2">
            <p className="mb-1 text-xs text-slate-300">
              Mão de obra{" "}
              <span
                className="text-slate-500"
                title="Fixo por peça ou valor por hora aplicado ao tempo manual."
              >
                (?)
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-200">
                <input
                  type="radio"
                  value="fixo"
                  className="border-slate-600 text-violet-500 focus:ring-violet-500"
                  {...form.register("advanced.maoDeObraTipo")}
                />
                Fixo/peça
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-200">
                <input
                  type="radio"
                  value="hora"
                  className="border-slate-600 text-violet-500 focus:ring-violet-500"
                  {...form.register("advanced.maoDeObraTipo")}
                />
                Por hora
              </label>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-300">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              min={0}
              className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              {...form.register("advanced.maoDeObraValor", { valueAsNumber: true })}
            />
            <p className="mt-0.5 text-[10px] text-slate-500">R$/peça ou R$/h conforme o modo.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-300">
              Tempo manual (min){" "}
              <span className="text-slate-500" title="Usado quando mão de obra é por hora.">
                (?)
              </span>
            </label>
            <input
              type="number"
              step="1"
              min={0}
              className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              {...form.register("advanced.tempoManualMin", { valueAsNumber: true })}
            />
          </div>
        </div>
      </section>

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

