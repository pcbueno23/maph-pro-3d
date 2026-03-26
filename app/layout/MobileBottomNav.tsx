"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LineChart, Bell, Calculator, Box, ShoppingCart, ChevronUp } from "lucide-react";
import { useAlertCount } from "@/hooks/useAlertCount";
import { navGroups } from "./navLinks";

const DIRECT_TABS = [
  { href: "/", label: "Dashboard", icon: LineChart },
  { href: "/alertas", label: "Alertas", icon: Bell },
];

const GROUP_TABS = [
  { groupId: "precificacao", label: "Precificação", icon: Calculator },
  { groupId: "producao", label: "Produto", icon: Box },
  { groupId: "vendas", label: "Vendas", icon: ShoppingCart },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const alertCount = useAlertCount();
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  function toggleGroup(id: string) {
    setOpenGroup((prev) => (prev === id ? null : id));
  }

  const activeGroup = navGroups.find((g) =>
    g.links.some((l) =>
      l.href === "/" ? pathname === "/" : pathname.startsWith(l.href)
    )
  );

  const openGroupData = navGroups.find((g) => g.id === openGroup);

  return (
    <>
      {/* Bottom sheet overlay */}
      {openGroup ? (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpenGroup(null)}
        />
      ) : null}

      {/* Bottom sheet links */}
      {openGroupData ? (
        <div className="fixed bottom-[57px] inset-x-0 z-50 rounded-t-2xl border-t border-slate-700 bg-slate-950/98 pb-2 pt-3 shadow-xl backdrop-blur-md lg:hidden">
          <div className="mb-2 flex items-center justify-between px-4">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              {openGroupData.label}
            </span>
            <button
              type="button"
              onClick={() => setOpenGroup(null)}
              className="text-slate-500 hover:text-slate-300"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-0.5 px-2">
            {openGroupData.links.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href as Parameters<typeof Link>[0]["href"]}
                  onClick={() => setOpenGroup(null)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    active
                      ? "bg-slate-800 text-cyan-400"
                      : "text-slate-300 hover:bg-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 inset-x-0 z-50 flex border-t border-slate-800 bg-slate-950/95 backdrop-blur-md lg:hidden">
        {/* Direct tabs */}
        {DIRECT_TABS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          const isAlertas = href === "/alertas";
          return (
            <Link
              key={href}
              href={href as Parameters<typeof Link>[0]["href"]}
              onClick={() => setOpenGroup(null)}
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

        {/* Group tabs */}
        {GROUP_TABS.map(({ groupId, label, icon: Icon }) => {
          const isOpen = openGroup === groupId;
          const isGroupActive = activeGroup?.id === groupId;
          return (
            <button
              key={groupId}
              type="button"
              onClick={() => toggleGroup(groupId)}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-3 text-[10px] font-medium transition-colors ${
                isOpen || isGroupActive ? "text-cyan-400" : "text-slate-500"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
              {isGroupActive && !isOpen ? (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-cyan-400" />
              ) : null}
            </button>
          );
        })}
      </nav>
    </>
  );
}
