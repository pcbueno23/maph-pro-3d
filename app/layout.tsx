import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AppShell } from "./layout/AppShell";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { PrintingTimerAlertsHost } from "@/components/orders/PrintingTimerAlertsHost";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";

export const metadata: Metadata = {
  title: "Maph Pro 3D",
  description:
    "Maph Pro 3D - Calculadora inteligente de custos e margens para empreendedores de impressão 3D.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        {GA_ID ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script
              id="ga-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_ID}');
                `,
              }}
            />
          </>
        ) : null}
        <AuthGuard>
          <AppShell>{children}</AppShell>
          <PrintingTimerAlertsHost />
          <PwaInstallPrompt />
          <ServiceWorkerRegister />
          <OnboardingChecklist />
        </AuthGuard>
      </body>
    </html>
  );
}

