"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicCatalog = Boolean(pathname?.startsWith("/c/"));

  if (isPublicCatalog) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <main className="min-h-screen px-4 py-6 md:px-8">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col md:pl-64">
        <Header />
        <main className="flex-1 px-4 pb-6 pt-4 md:px-8 md:pb-8 md:pt-6">
          <div className="glass-panel rounded-2xl p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
