"use client";

import Link from "next/link";
import { CheckCircle2, CreditCard, Download, Lock, Puzzle } from "lucide-react";
import { useAccessStore } from "@/store/accessStore";

const STORE_URL = process.env.NEXT_PUBLIC_EXTENSION_STORE_URL?.trim() || null;

const FEATURES = [
  "Raio-X da busca: campeões de venda, idade dos anúncios e vendedores direto na página da Shopee",
  "Faturamento estimado, vendas/dia e nota em cada anúncio, sem precisar abrir um por um",
  "Baixe todas as imagens do anúncio de uma vez, ou busque o modelo no MakerWorld em um clique",
  "Abra a calculadora de custo ou de preço Shopee direto do anúncio, já com os dados dele",
];

export default function ExtensaoPage() {
  const accessChecked = useAccessStore((s) => s.checked);
  const hasPaidPlan = useAccessStore((s) => s.hasPaidPlan);
  const extensionGranted = useAccessStore((s) => s.extensionGranted);
  const unlocked = hasPaidPlan || extensionGranted;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
          Extensão Maph Pro 3D
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Leve os dados do Maph Pro 3D pra dentro da Shopee — direto no navegador, sem trocar de aba.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 shadow-[0_0_0_1px_rgba(6,182,212,0.08)]">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/15">
            <Puzzle className="h-6 w-6 text-cyan-400" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-slate-50">O que a extensão faz</p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {!accessChecked ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-sm text-slate-400">
          Verificando seu acesso...
        </div>
      ) : unlocked ? (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-6">
          <p className="text-sm font-semibold text-slate-50">Disponível pra você</p>
          <p className="mt-1 text-sm text-slate-300">
            Sua assinatura já libera a extensão. Instale e abra qualquer anúncio ou busca na Shopee.
          </p>
          {STORE_URL ? (
            <a
              href={STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400"
            >
              <Download className="h-4 w-4" />
              Instalar extensão
            </a>
          ) : (
            <p className="mt-4 text-xs text-slate-500">
              A extensão ainda está em revisão na Chrome Web Store — assim que for aprovada, o botão de
              instalação aparece aqui automaticamente.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">
            <Lock className="h-4 w-4" />
            Recurso exclusivo pra assinantes
          </div>
          <p className="mt-3 text-sm text-slate-300">
            A extensão é liberada junto com um plano pago. Assine pra instalar e usar direto nos
            anúncios da Shopee.
          </p>
          <Link
            href="/pricing"
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400"
          >
            <CreditCard className="h-4 w-4" />
            Ver planos
          </Link>
        </div>
      )}

      <p className="text-center text-xs text-slate-500">
        <Link href="/" className="text-cyan-200/80 underline-offset-2 hover:underline">
          Voltar ao painel
        </Link>
      </p>
    </div>
  );
}
