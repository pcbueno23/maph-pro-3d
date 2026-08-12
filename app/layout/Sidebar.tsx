"use client";

import type { ComponentType } from "react";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, ChevronDown, ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import {
  topNavLinks,
  navGroups,
  secondaryNavLinksAfterDivider,
  secondaryNavLinksBeforeDivider,
} from "./navLinks";
import { useAdminWhoami } from "@/hooks/useAdminWhoami";
import { useAlertCount } from "@/hooks/useAlertCount";
import { useAffiliateMe } from "@/hooks/useAffiliateMe";
import { useFreeAccessMode } from "@/hooks/useFreeAccessMode";
import { useUIStore } from "@/store/uiStore";

function NavLinkRow({
  href,
  label,
  icon: Icon,
  pathname,
  badge,
  indent,
  collapsed,
}: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  pathname: string;
  badge?: number;
  indent?: boolean;
  collapsed?: boolean;
}) {
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  const hasBadge = badge != null && badge > 0;
  return (
    <Link
      href={href as Parameters<typeof Link>[0]["href"]}
      title={collapsed ? label : undefined}
      className={`group relative flex items-center gap-2 rounded-xl py-2 text-sm transition-colors ${
        collapsed ? "justify-center px-2" : `px-3 ${indent ? "pl-5" : ""}`
      } ${
        active
          ? "bg-slate-900 text-cyan-400 shadow-neon-cyan"
          : "text-slate-400 hover:bg-slate-900/70 hover:text-slate-100"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {collapsed ? (
        hasBadge ? (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" />
        ) : null
      ) : (
        <>
          <span className="flex-1">{label}</span>
          {hasBadge ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold leading-none text-white">
              {badge! > 99 ? "99+" : badge}
            </span>
          ) : null}
        </>
      )}
    </Link>
  );
}

function NavGroupSection({
  group,
  pathname,
  collapsed,
}: {
  group: (typeof navGroups)[number];
  pathname: string;
  collapsed?: boolean;
}) {
  const isGroupActive = group.links.some((l) =>
    l.href === "/" ? pathname === "/" : pathname.startsWith(l.href)
  );
  const [open, setOpen] = useState(isGroupActive);

  // Auto-expand when navigating to a child route
  useEffect(() => {
    if (isGroupActive) setOpen(true);
  }, [isGroupActive]);

  if (collapsed) {
    // Sem espaço pro cabeçalho do grupo (texto) — mostra os ícones direto, sem indentação.
    return (
      <div className="space-y-0.5">
        {group.links.map(({ href, label, icon }) => (
          <NavLinkRow
            key={href}
            href={href}
            label={label}
            icon={icon}
            pathname={pathname}
            collapsed
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${
          isGroupActive
            ? "text-cyan-400"
            : "text-slate-500 hover:text-slate-300"
        }`}
      >
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div className="mt-0.5 space-y-0.5">
          {group.links.map(({ href, label, icon }) => (
            <NavLinkRow
              key={href}
              href={href}
              label={label}
              icon={icon}
              pathname={pathname}
              indent
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const isAdmin = useAdminWhoami();
  const freeAccessMode = useFreeAccessMode();
  const secondaryAfterDivider = freeAccessMode
    ? secondaryNavLinksAfterDivider.filter((l) => l.href !== "/pricing")
    : secondaryNavLinksAfterDivider;
  const alertCount = useAlertCount();
  const affiliateState = useAffiliateMe();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 hidden h-[100dvh] max-h-[100dvh] flex-col overflow-hidden border-r border-slate-800 bg-slate-950/80 py-6 transition-[width] duration-200 lg:flex ${
        sidebarCollapsed ? "w-20 px-2" : "w-64 px-4"
      }`}
    >
      <button
        type="button"
        onClick={toggleSidebar}
        title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
        className="absolute -right-3 top-8 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-400 shadow-md hover:border-cyan-500/50 hover:text-cyan-300"
      >
        {sidebarCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>

      <div
        className={`mb-8 flex shrink-0 items-center gap-3 ${
          sidebarCollapsed ? "justify-center" : ""
        }`}
      >
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-slate-900/80">
          <Image
            src="/logo-maph-pro-3d.png"
            alt="MAPH PRO 3D"
            width={64}
            height={64}
            className="h-12 w-12 object-contain"
            priority
          />
        </div>
        {sidebarCollapsed ? null : (
          <div>
            <p className="text-base font-semibold tracking-tight text-slate-50">
              MAPH PRO 3D
            </p>
            <p className="text-[11px] text-slate-400">Profissionalize seu negócio 3D</p>
          </div>
        )}
      </div>

      <nav className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
          {/* Always-visible top links */}
          {topNavLinks.map(({ href, label, icon }) => (
            <NavLinkRow
              key={href}
              href={href}
              label={label}
              icon={icon}
              pathname={pathname}
              badge={href === "/alertas" ? alertCount : undefined}
              collapsed={sidebarCollapsed}
            />
          ))}

          {/* Collapsible groups */}
          <div className="mt-3 space-y-1">
            {navGroups.map((group) => (
              <NavGroupSection
                key={group.id}
                group={group}
                pathname={pathname}
                collapsed={sidebarCollapsed}
              />
            ))}
          </div>
        </div>

        {/* Bottom secondary links */}
        <div className="mt-4 shrink-0 space-y-0.5 border-t border-slate-800/90 pt-4">
          {secondaryNavLinksBeforeDivider.map(({ href, label, icon }) => (
            <NavLinkRow
              key={href}
              href={href}
              label={label}
              icon={icon}
              pathname={pathname}
              collapsed={sidebarCollapsed}
            />
          ))}
          <div
            className="my-2 border-t border-slate-800/80"
            role="separator"
            aria-hidden
          />
          {secondaryAfterDivider.map(({ href, label, icon }) => (
            <NavLinkRow
              key={href}
              href={href}
              label={label}
              icon={icon}
              pathname={pathname}
              collapsed={sidebarCollapsed}
            />
          ))}
          {affiliateState.status === "active" ? (
            <NavLinkRow
              href="/afiliados"
              label="Afiliados"
              icon={Share2}
              pathname={pathname}
              collapsed={sidebarCollapsed}
            />
          ) : null}
          {isAdmin ? (
            <NavLinkRow
              href="/admin"
              label="Admin"
              icon={Shield}
              pathname={pathname}
              collapsed={sidebarCollapsed}
            />
          ) : null}
        </div>
      </nav>
    </aside>
  );
}
