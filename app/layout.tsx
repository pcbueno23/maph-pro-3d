import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "./layout/Sidebar";
import { Header } from "./layout/Header";
import { AuthGuard } from "@/components/auth/AuthGuard";

export const metadata: Metadata = {
  title: "Precifica3D",
  description:
    "Precifica3D - Calculadora inteligente de custos e margens para empreendedores de impressão 3D.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <AuthGuard>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex flex-1 flex-col">
              <Header />
              <main className="flex-1 px-4 pb-6 pt-4 md:px-8 md:pb-8 md:pt-6">
                <div className="glass-panel rounded-2xl p-4 md:p-6">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </AuthGuard>
      </body>
    </html>
  );
}

