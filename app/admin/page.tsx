"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AdminUsersTab } from "@/components/admin/AdminUsersTab";
import { AdminMarketingSection } from "@/components/admin/AdminMarketingSection";
import { AdminMetricsTab } from "@/components/admin/AdminMetricsTab";
import { AdminSiteConfigTab } from "@/components/admin/AdminSiteConfigTab";
import { AdminAuditTab } from "@/components/admin/AdminAuditTab";
import { AdminHealthTab } from "@/components/admin/AdminHealthTab";

type AdminTab =
  | "users"
  | "marketing"
  | "metrics"
  | "site"
  | "audit"
  | "health";

const tabs: { id: AdminTab; label: string }[] = [
  { id: "users", label: "Contas e trial" },
  { id: "marketing", label: "Fornecedores e promoções" },
  { id: "metrics", label: "Métricas" },
  { id: "site", label: "Site e banner" },
  { id: "audit", label: "Auditoria" },
  { id: "health", label: "Integrações" },
];

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("users");
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!supabase) {
        setAllowed(false);
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setAllowed(false);
        return;
      }
      const who = await fetch("/api/admin/whoami", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const whoBody = (await who.json()) as { admin?: boolean };
      if (cancelled) return;
      setAllowed(Boolean(who.ok && whoBody.admin));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (allowed === false) {
    return (
      <div className="space-y-3 text-slate-200">
        <h1 className="text-lg font-semibold text-slate-50">Admin</h1>
        <p className="text-sm text-slate-400">
          Você não tem permissão para acessar esta área. Defina seu e-mail em{" "}
          <code className="rounded bg-slate-900 px-1.5 py-0.5 text-xs text-cyan-300">
            ADMIN_EMAILS
          </code>{" "}
          no servidor e reinicie o app.
        </p>
      </div>
    );
  }

  if (allowed === null) {
    return (
      <p className="text-sm text-slate-500">Verificando permissão…</p>
    );
  }

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
    </div>
  );
}
