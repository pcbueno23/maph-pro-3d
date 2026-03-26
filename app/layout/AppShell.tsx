"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { SiteBanner } from "@/components/SiteBanner";
import { SitePublicLinks } from "@/components/SitePublicLinks";
import { MobileBottomNav } from "./MobileBottomNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicCatalog = Boolean(pathname?.startsWith("/c/"));
  const isTrialExpired = pathname === "/trial-expired";

  if (isPublicCatalog || isTrialExpired) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <main className="min-h-screen px-4 py-6 md:px-8">{children}</main>
        <SitePublicLinks className="mx-auto mt-4 max-w-6xl px-4 pb-6 md:mt-6 md:px-8" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <SiteBanner />
        <Header />
        <main className="flex flex-1 flex-col px-4 pb-20 pt-4 lg:px-8 lg:pb-6 lg:pt-6">
          <div className="glass-panel min-h-0 flex-1 rounded-2xl p-4 md:p-6">
            {children}
          </div>
          <SitePublicLinks className="mt-4 shrink-0 md:mt-6" />
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
