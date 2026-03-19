"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone =
      // Android/Chrome
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      // iOS Safari
      (window.navigator as any)?.standalone === true;

    setIsStandalone(Boolean(standalone));

    const onBeforeInstallPrompt = (e: Event) => {
      // Mantém o tipo solto porque TS não tem lib padrão para isso.
      const event = e as BeforeInstallPromptEvent;
      // Só reaproveita se ainda não estiver em standalone.
      if (!isStandalone) {
        e.preventDefault?.();
        setDeferredPrompt(event);
      }
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isStandalone || !deferredPrompt) return null;

  const installNow = async () => {
    try {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch {
      // Se falhar, só remove e deixa o usuário tentar manualmente.
    } finally {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        type="button"
        onClick={() => void installNow()}
        className="rounded-2xl bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-200 shadow-neon-cyan border border-cyan-500/30 hover:bg-cyan-500/25 transition"
      >
        Instalar app
      </button>
    </div>
  );
}

