"use client";
import { useEffect } from "react";

export function GoogleAnalytics({ id }: { id: string }) {
  useEffect(() => {
    if (!id) return;

    const existing = document.getElementById("ga-script");
    if (existing) return;

    const script = document.createElement("script");
    script.id = "ga-script";
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    script.async = true;
    document.head.appendChild(script);

    // @ts-expect-error gtag global
    window.dataLayer = window.dataLayer || [];
    // @ts-expect-error gtag global
    window.gtag = function () { window.dataLayer.push(arguments); }; // eslint-disable-line prefer-rest-params
    // @ts-expect-error gtag global
    window.gtag("js", new Date());
    // @ts-expect-error gtag global
    window.gtag("config", id);
  }, [id]);

  return null;
}
