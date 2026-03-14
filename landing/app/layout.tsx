import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maph Pro 3D – Precificação e gestão para impressão 3D",
  description:
    "Calculadora de custos, margens e preços para makers e negócios de impressão 3D. Shopee, Mercado Livre e venda direta.",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
