"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calculator,
  LineChart,
  Package,
  Settings,
  CreditCard,
} from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: LineChart },
  { href: "/calculator", label: "Calculadora", icon: Calculator },
  { href: "/products", label: "Produtos", icon: Package },
  { href: "/inventory", label: "Estoque", icon: Package },
  { href: "/sales", label: "Vendas", icon: Package },
  { href: "/reports", label: "Relatórios", icon: LineChart },
  { href: "/analyzer", label: "Analisador STL", icon: LineChart },
  { href: "/pricing", label: "Planos", icon: CreditCard },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col border-r border-slate-800 bg-slate-950/80 px-4 py-6 md:flex">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-12 w-12 overflow-hidden rounded-2xl bg-slate-900/80">
          <Image
            src="/logo-maph-pro-3d.png"
            alt="MAPH PRO 3D"
            width={64}
            height={64}
            className="h-12 w-12 object-contain"
            priority
          />
        </div>
        <div>
          <p className="text-base font-semibold tracking-tight text-slate-50">
            MAPH PRO 3D
          </p>
          <p className="text-[11px] text-slate-400">Profissionalize seu negócio 3D</p>
        </div>
      </div>

      <nav className="space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href as Parameters<typeof Link>[0]["href"]}
              className={`group flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-slate-900 text-cyan-400 shadow-neon-cyan"
                  : "text-slate-400 hover:bg-slate-900/70 hover:text-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

