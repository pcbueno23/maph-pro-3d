import type { LucideIcon } from "lucide-react";
import {
  Calculator,
  LineChart,
  Package,
  Settings,
  CreditCard,
  Store,
  Percent,
  Printer,
  FileText,
  LayoutGrid,
  Bell,
  User,
  GraduationCap,
  MessageCircle,
} from "lucide-react";

export type NavLinkItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** Ferramentas principais — topo do menu */
export const primaryNavLinks: NavLinkItem[] = [
  { href: "/", label: "Dashboard", icon: LineChart },
  { href: "/sales", label: "Vendas", icon: Package },
  { href: "/calculator", label: "Calculadora de markup", icon: Calculator },
  {
    href: "/margem-certa",
    label: "Calculadora margem certa",
    icon: Calculator,
  },
  { href: "/products", label: "Produtos", icon: Package },
  { href: "/inventory", label: "Peças produzidas", icon: Package },
  { href: "/ordens", label: "Ordens de produção", icon: Printer },
  { href: "/impressoras", label: "Impressoras", icon: Printer },
  { href: "/insumos", label: "Insumos", icon: Package },
  { href: "/alertas", label: "Alertas", icon: Bell },
  { href: "/reports", label: "Relatórios", icon: LineChart },
  { href: "/catalogo", label: "Catálogo", icon: LayoutGrid },
  { href: "/orcamentos", label: "Orçamentos", icon: FileText },
];

/**
 * Rodapé do menu (de cima para baixo na coluna inferior):
 * Fornecedores → … → Suporte, depois divisor, Assinaturas / Conta / Configurações.
 */
export const secondaryNavLinksBeforeDivider: NavLinkItem[] = [
  { href: "/fornecedores", label: "Fornecedores", icon: Store },
  { href: "/promocoes", label: "Promoções", icon: Percent },
  { href: "/tutorial", label: "Tutorial", icon: GraduationCap },
  { href: "/suporte", label: "Suporte", icon: MessageCircle },
];

export const secondaryNavLinksAfterDivider: NavLinkItem[] = [
  { href: "/pricing", label: "Assinaturas", icon: CreditCard },
  { href: "/conta", label: "Conta", icon: User },
  { href: "/settings", label: "Configurações", icon: Settings },
];

/** Ordem do menu mobile (mesma lógica da sidebar) */
export const mobileNavLinksFlat: { href: string; label: string }[] = [
  ...primaryNavLinks.map(({ href, label }) => ({ href, label })),
  ...secondaryNavLinksBeforeDivider.map(({ href, label }) => ({ href, label })),
  ...secondaryNavLinksAfterDivider.map(({ href, label }) => ({ href, label })),
];
