"use client";

import type { ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  primaryNavLinks,
  secondaryNavLinksAfterDivider,
  secondaryNavLinksBeforeDivider,
} from "./navLinks";

function NavLinkRow({
  href,
  label,
  icon: Icon,
  pathname,
}: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  pathname: string;
}) {
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
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
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col overflow-hidden border-r border-slate-800 bg-slate-950/80 px-4 py-6 md:flex">
      <div className="mb-8 flex shrink-0 items-center gap-3">
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

      <nav className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {primaryNavLinks.map(({ href, label, icon }) => (
            <NavLinkRow
              key={href}
              href={href}
              label={label}
              icon={icon}
              pathname={pathname}
            />
          ))}
        </div>

        <div className="mt-4 shrink-0 space-y-1 border-t border-slate-800/90 pt-4">
          {secondaryNavLinksBeforeDivider.map(({ href, label, icon }) => (
            <NavLinkRow
              key={href}
              href={href}
              label={label}
              icon={icon}
              pathname={pathname}
            />
          ))}
          <div
            className="my-2 border-t border-slate-800/80"
            role="separator"
            aria-hidden
          />
          {secondaryNavLinksAfterDivider.map(({ href, label, icon }) => (
            <NavLinkRow
              key={href}
              href={href}
              label={label}
              icon={icon}
              pathname={pathname}
            />
          ))}
        </div>
      </nav>
    </aside>
  );
}
