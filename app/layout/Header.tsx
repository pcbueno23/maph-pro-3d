"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Calculator, Menu } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useCalculatorStore } from "@/store/calculatorStore";
import { supabase } from "@/lib/supabaseClient";

const titles: Record<string, string> = {
  "/": "Visão geral",
  "/calculator": "Calculadora de produtos",
  "/products": "Produtos salvos",
  "/settings": "Configurações",
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const requestSave = useCalculatorStore((s) => s.requestSave);
  const isCalculator = pathname === "/calculator";

  const title =
    Object.entries(titles).find(([path]) => pathname.startsWith(path))?.[1] ??
    "MAPH PRO 3D";

  if (pathname === "/login") {
    return null;
  }

  async function handleLogout() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    clearAuth();
    router.replace("/login");
  }

  return (
    <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-3 backdrop-blur-md md:px-8">
      <div className="flex items-center gap-3">
        <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 text-slate-300 shadow-sm transition hover:border-slate-700 hover:bg-slate-900 md:hidden">
          <Menu className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 overflow-hidden rounded-xl bg-slate-900/80 md:h-9 md:w-9">
            <Image
              src="/logo-maph-pro-3d.png"
              alt="MAPH PRO 3D"
              width={40}
              height={40}
              className="h-8 w-8 object-contain md:h-9 md:w-9"
              priority
            />
          </div>
          <h1 className="text-base font-semibold text-slate-50 md:text-lg">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-400">
        {user && (
          <span className="hidden rounded-full bg-slate-900/80 px-3 py-1 md:inline-flex">
            {user.email}
          </span>
        )}
        {!user && (
          <span className="rounded-full bg-slate-900/80 px-3 py-1">
            Beta para makers
          </span>
        )}
        {isCalculator ? (
          <button
            type="button"
            onClick={() => requestSave()}
            className="hidden rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-1.5 text-xs font-medium text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400 md:inline-flex"
          >
            Salvar e nova simulação
          </button>
        ) : (
          <Link
            href="/calculator"
            className="hidden rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-1.5 text-xs font-medium text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400 md:inline-flex"
          >
            Nova simulação
          </Link>
        )}
        {user ? (
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-[11px] text-slate-200 transition hover:bg-slate-900"
          >
            Sair
          </button>
        ) : (
          <Link
            href="/login"
            className="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-[11px] text-slate-200 transition hover:bg-slate-900"
          >
            Entrar
          </Link>
        )}
      </div>
    </header>
  );
}

