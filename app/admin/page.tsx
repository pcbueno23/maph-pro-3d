"use client";

import { useState } from "react";
import { AdminUsersTab } from "@/components/admin/AdminUsersTab";
import { AdminMarketingSection } from "@/components/admin/AdminMarketingSection";
import { AdminMetricsTab } from "@/components/admin/AdminMetricsTab";
import { AdminSiteConfigTab } from "@/components/admin/AdminSiteConfigTab";
import { AdminAuditTab } from "@/components/admin/AdminAuditTab";
import { AdminHealthTab } from "@/components/admin/AdminHealthTab";
import { AdminAfiliadosTab } from "@/components/admin/AdminAfiliadosTab";

type AdminTab =
  | "users"
  | "marketing"
  | "metrics"
  | "site"
  | "audit"
  | "health"
  | "afiliados";

const tabs: { id: AdminTab; label: string }[] = [
  { id: "users", label: "Contas e trial" },
  { id: "marketing", label: "Fornecedores e promoções" },
  { id: "metrics", label: "Métricas" },
  { id: "site", label: "Site e banner" },
  { id: "audit", label: "Auditoria" },
  { id: "health", label: "Integrações" },
  { id: "afiliados", label: "Afiliados" },
];

// Proteção de acesso feita no servidor: middleware.ts + app/admin/layout.tsx
export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("users");

  return (
    <div className="space-y-6 text-slate-200">
      <div>
        <h1 className="text-lg font-semibold text-slate-50">Painel admin</h1>
        <p className="mt-1 text-sm text-slate-400">
          Contas, conteúdo público, métricas e integrações.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition md:px-4 ${
                tab === t.id
                  ? "bg-slate-800 text-cyan-300 shadow-neon-cyan"
                  : "border border-slate-800 text-slate-400 hover:bg-slate-900/80"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "users" ? <AdminUsersTab /> : null}
      {tab === "marketing" ? <AdminMarketingSection /> : null}
      {tab === "metrics" ? <AdminMetricsTab /> : null}
      {tab === "site" ? <AdminSiteConfigTab /> : null}
      {tab === "audit" ? <AdminAuditTab /> : null}
      {tab === "health" ? <AdminHealthTab /> : null}
      {tab === "afiliados" ? <AdminAfiliadosTab /> : null}
    </div>
  );
}
