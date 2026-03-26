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
    <div className="fixed top-[72px] right-4 z-50 md:top-auto md:bottom-6 md:right-6">
      <button
        type="button"
        onClick={() => void installNow()}
        className="flex items-center gap-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/15 px-4 py-2.5 text-sm font-semibold text-cyan-200 shadow-neon-cyan transition hover:bg-cyan-500/25"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Instalar app
      </button>
    </div>
  );
}

