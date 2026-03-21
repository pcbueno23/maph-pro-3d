"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import {
  formatWhatsAppDisplay,
  getWhatsAppSupportChatLink,
  getWhatsAppSupportDisplayDigits,
} from "@/lib/supportWhatsApp";

export default function SuportePage() {
  const chatLink = getWhatsAppSupportChatLink();
  const digits = getWhatsAppSupportDisplayDigits();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
          Suporte
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Fale com a equipe pelo WhatsApp para dúvidas, sugestões ou problemas no app.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 shadow-[0_0_0_1px_rgba(6,182,212,0.08)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15">
              <MessageCircle className="h-6 w-6 text-emerald-400" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-slate-50">WhatsApp</p>
              <p className="text-sm text-slate-300">
                Contato:{" "}
                <span className="font-medium text-cyan-300">
                  {formatWhatsAppDisplay(digits)}
                </span>
              </p>
              <p className="text-xs text-slate-500">
                Horário de resposta: em geral no mesmo dia útil.
              </p>
              <p className="pt-1 text-[11px] text-slate-500">
                Link direto:{" "}
                <a
                  href={chatLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-cyan-400/90 underline decoration-cyan-500/40 underline-offset-2 hover:text-cyan-300"
                >
                  {chatLink}
                </a>
              </p>
            </div>
          </div>

          <a
            href={chatLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-neon-cyan transition hover:bg-amber-400"
          >
            Abrir WhatsApp
          </a>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-4 text-xs text-slate-400">
        <p className="font-medium text-slate-300">Sobre o link</p>
        <p className="mt-1 leading-relaxed">
          O atalho oficial abre o WhatsApp com uma mensagem de boas-vindas do MAPH PRO 3D.
          Para trocar o link em produção, use{" "}
          <code className="rounded bg-slate-950 px-1 py-0.5 text-[11px] text-cyan-300">
            NEXT_PUBLIC_WHATSAPP_SUPPORT_LINK
          </code>{" "}
          no ambiente.
        </p>
      </div>

      <p className="text-center text-xs text-slate-500">
        <Link href="/" className="text-cyan-200/80 underline-offset-2 hover:underline">
          Voltar ao painel
        </Link>
      </p>
    </div>
  );
}
