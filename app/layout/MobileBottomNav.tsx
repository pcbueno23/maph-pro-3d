"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LineChart,
  Calculator,
  ShoppingCart,
  Bell,
  LayoutGrid,
} from "lucide-react";
import { useAlertCount } from "@/hooks/useAlertCount";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LineChart },
  { href: "/calculator", label: "Calcular", icon: Calculator },
  { href: "/sales", label: "Vendas", icon: ShoppingCart },
  { href: "/alertas", label: "Alertas", icon: Bell },
  { href: "/products", label: "Produtos", icon: LayoutGrid },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const alertCount = useAlertCount();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 flex border-t border-slate-800 bg-slate-950/95 backdrop-blur-md md:hidden">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        const isAlertas = href === "/alertas";
        return (
          <Link
            key={href}
            href={href as Parameters<typeof Link>[0]["href"]}
            className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-3 text-[10px] font-medium transition-colors ${
              active ? "text-cyan-400" : "text-slate-500"
            }`}
          >
            <div className="relative">
              <Icon className="h-5 w-5" />
              {isAlertas && alertCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white">
                  {alertCount > 99 ? "99+" : alertCount}
                </span>
              ) : null}
            </div>
            <span>{label}</span>
            {active ? (
              <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-cyan-400" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
