"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useAccessStore } from "@/store/accessStore";
import { useCalculatorStore } from "@/store/calculatorStore";
import { supabase } from "@/lib/supabaseClient";
import { clearUserData } from "@/lib/clearUserData";
import { mobileNavLinksFlat } from "./navLinks";
import { useAdminWhoami } from "@/hooks/useAdminWhoami";

const titles: Record<string, string> = {
  "/": "Visão geral",
  "/calculator": "Calculadora de markup",
  "/margem-certa": "Calculadora margem certa",
  "/products": "Produtos salvos",
  "/catalogo": "Catálogo",
  "/printer": "Impressora",
  "/fornecedores": "Fornecedores",
  "/promocoes": "Promoções",
  "/tutorial": "Tutorial",
  "/suporte": "Suporte",
  "/conta": "Conta",
  "/settings": "Configurações",
  "/pricing": "Assinaturas",
  "/trial-expired": "Acesso encerrado",
  "/admin": "Admin",
};

const mobileLinks = mobileNavLinksFlat;

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const accessChecked = useAccessStore((s) => s.checked);
  const accessPaid = useAccessStore((s) => s.hasPaidPlan);
  const accessDaysRemaining = useAccessStore((s) => s.daysRemaining);
  const accessTrialEndsAt = useAccessStore((s) => s.trialEndsAt);
  const requestNewSimulation = useCalculatorStore((s) => s.requestNewSimulation);
  const isCalculator = pathname === "/calculator";
   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdmin = useAdminWhoami();

  const title =
    Object.entries(titles)
      .sort((a, b) => b[0].length - a[0].length)
      .find(([path]) => (path === "/" ? pathname === "/" : pathname.startsWith(path)))?.[1] ??
    "MAPH PRO 3D";

  if (pathname === "/login") {
    return null;
  }

  async function handleLogout() {
    clearUserData();
    if (supabase) {
      await supabase.auth.signOut();
    }
    clearAuth();
    router.replace("/login");
  }

  return (
    <>
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-3 backdrop-blur-md md:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 text-slate-300 shadow-sm transition hover:border-slate-700 hover:bg-slate-900 md:hidden"
            aria-label="Abrir menu de navegação"
          >
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

        <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-slate-400">
          {user && (
            <span className="hidden max-w-[200px] truncate rounded-full bg-slate-900/80 px-3 py-1 md:inline-flex">
              {user.email}
            </span>
          )}
          {user &&
            accessChecked &&
            !accessPaid &&
            accessDaysRemaining != null &&
            accessDaysRemaining > 0 &&
            accessTrialEndsAt && (
              <span
                className="inline-flex max-w-[11rem] truncate rounded-full border border-cyan-500/35 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-200 sm:max-w-none sm:px-3 sm:text-xs"
                title={`Conta criada em ${new Date(user.created_at).toLocaleDateString("pt-BR")}`}
              >
                Teste: {accessDaysRemaining}d · até{" "}
                {new Date(accessTrialEndsAt).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                })}
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
              onClick={() => requestNewSimulation()}
              className="inline-flex rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-1.5 text-xs font-medium text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400"
            >
              Nova simulação
            </button>
          ) : (
            <Link
              href="/calculator"
              className="inline-flex rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-1.5 text-xs font-medium text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400"
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

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/90 backdrop-blur-md md:hidden">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 overflow-hidden rounded-xl bg-slate-900/80">
                  <Image
                    src="/logo-maph-pro-3d.png"
                    alt="MAPH PRO 3D"
                    width={40}
                    height={40}
                    className="h-8 w-8 object-contain"
                    priority
                  />
                </div>
                <span className="text-sm font-semibold text-slate-50">
                  Navegação
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 text-slate-300 shadow-sm transition hover:border-slate-700 hover:bg-slate-900"
                aria-label="Fechar menu de navegação"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
              {mobileLinks.map((link) => {
                const active =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block rounded-xl px-3 py-2 text-sm ${
                      active
                        ? "bg-slate-900 text-cyan-400 shadow-neon-cyan"
                        : "text-slate-300 hover:bg-slate-900/80"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              {isAdmin ? (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block rounded-xl px-3 py-2 text-sm ${
                    pathname.startsWith("/admin")
                      ? "bg-slate-900 text-cyan-400 shadow-neon-cyan"
                      : "text-slate-300 hover:bg-slate-900/80"
                  }`}
                >
                  Admin
                </Link>
              ) : null}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

