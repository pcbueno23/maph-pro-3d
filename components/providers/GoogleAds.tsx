"use client";
import { useEffect } from "react";

const GADS_ID = process.env.NEXT_PUBLIC_GADS_ID ?? "";
const GADS_CONVERSION = process.env.NEXT_PUBLIC_GADS_CONVERSION ?? "";

export function GoogleAds() {
  useEffect(() => {
    if (!GADS_ID) return;

    // dataLayer + gtag podem já existir (carregados pelo GoogleAnalytics)
    // @ts-expect-error gtag global
    window.dataLayer = window.dataLayer || [];
    // @ts-expect-error gtag global
    if (!window.gtag) {
      // @ts-expect-error gtag global
      window.gtag = function () { window.dataLayer.push(arguments); }; // eslint-disable-line prefer-rest-params
      // @ts-expect-error gtag global
      window.gtag("js", new Date());
    }

    // Carrega o script gtag se nenhuma outra tag já carregou
    if (!document.getElementById("ga-script") && !document.getElementById("gads-script")) {
      const script = document.createElement("script");
      script.id = "gads-script";
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GADS_ID}`;
      script.async = true;
      document.head.appendChild(script);
    }

    // Registra a conta Google Ads
    // @ts-expect-error gtag global
    window.gtag("config", GADS_ID);

    // Cadastro via Google OAuth: o callback adiciona ?new_user=1 para novos usuários
    const params = new URLSearchParams(window.location.search);
    if (params.get("new_user") === "1") {
      fireSignupConversion();
      // Remove o param da URL sem recarregar a página
      params.delete("new_user");
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "") + window.location.hash;
      window.history.replaceState(null, "", newUrl);
    }
  }, []);

  return null;
}

/** Dispara o evento de conversão de cadastro (chame após signup bem-sucedido). */
export function fireSignupConversion() {
  if (typeof window === "undefined") return;
  // @ts-expect-error gtag global
  const gtag = window.gtag;
  if (typeof gtag !== "function" || !GADS_CONVERSION) return;
  gtag("event", "conversion", {
    send_to: GADS_CONVERSION,
    value: 29.9,
    currency: "BRL",
  });
}
