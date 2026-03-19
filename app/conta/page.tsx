"use client";

import { AccountForm } from "@/components/account/AccountForm";

export default function ContaPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
        Conta
      </h1>
      <AccountForm />
    </div>
  );
}

