"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";

export type OnboardingStep = {
  id: string;
  label: string;
  description: string;
  href: string;
};

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "impressora",
    label: "Cadastre sua impressora",
    description: "Necessária para calcular depreciação e energia automaticamente.",
    href: "/impressoras",
  },
  {
    id: "insumo",
    label: "Adicione um insumo",
    description: "Cadastre filamento ou outro material para usar na calculadora.",
    href: "/insumos",
  },
  {
    id: "calculo",
    label: "Faça seu primeiro cálculo",
    description: "Calcule o custo da peça e envie para a calculadora ML ou Shopee.",
    href: "/precificacao-marketplaces",
  },
];

function storageKey(userId: string) {
  return `onboarding_v1_${userId}`;
}

export function useOnboarding() {
  const { user } = useAuthStore();
  const userId = user?.id ?? "";

  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    try {
      const raw = localStorage.getItem(storageKey(userId));
      if (raw) {
        const parsed = JSON.parse(raw) as {
          completed?: Record<string, boolean>;
          dismissed?: boolean;
        };
        setCompleted(parsed.completed ?? {});
        setDismissed(parsed.dismissed ?? false);
      }
    } catch {}
    setLoaded(true);
  }, [userId]);

  function save(next: { completed: Record<string, boolean>; dismissed: boolean }) {
    if (!userId) return;
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(next));
    } catch {}
  }

  function markStep(id: string) {
    const next = { ...completed, [id]: true };
    setCompleted(next);
    save({ completed: next, dismissed });
  }

  function dismiss() {
    setDismissed(true);
    save({ completed, dismissed: true });
  }

  const allDone = ONBOARDING_STEPS.every((s) => completed[s.id]);
  const visible = loaded && !dismissed && !allDone && !!userId;

  return { steps: ONBOARDING_STEPS, completed, markStep, dismiss, visible };
}
