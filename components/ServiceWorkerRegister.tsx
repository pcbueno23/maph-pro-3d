"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch (error) {
        // silencioso em produção; opcionalmente logar em ferramenta de analytics
        console.error("Falha ao registrar service worker", error);
      }
    };

    register();
  }, []);

  return null;
}

