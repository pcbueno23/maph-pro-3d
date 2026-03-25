"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

type MobileNavProps = {
  appLoginUrl: string;
  appSignupUrl: string;
  docsUrl: string | null;
};

export function MobileNav({ appLoginUrl, appSignupUrl, docsUrl }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 text-slate-200 transition hover:bg-slate-800 md:hidden"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-40 flex flex-col bg-slate-950/98 px-6 pb-8 pt-24 md:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <nav className="flex flex-col gap-1">
            {[
              { href: "#oferta", label: "Oferta" },
              { href: "#recursos", label: "Recursos" },
              { href: "#precos", label: "Preços" },
              { href: "#qualificacao", label: "Diagnóstico" },
              { href: "#faq", label: "FAQ" },
              {
                href: docsUrl ?? "#docs",
                label: docsUrl ? "Documentação" : "Primeiros passos",
              },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3.5 text-base font-medium text-slate-200 transition hover:bg-slate-900 hover:text-cyan-400"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="mt-8 flex flex-col gap-3">
            <Link
              href={appLoginUrl}
              onClick={() => setOpen(false)}
              className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3.5 text-center text-base font-medium text-slate-200 transition hover:bg-slate-800"
            >
              Entrar
            </Link>
            <Link
              href={appSignupUrl}
              onClick={() => setOpen(false)}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-3.5 text-center text-base font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-emerald-400"
            >
              Começar grátis — sem cartão
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
