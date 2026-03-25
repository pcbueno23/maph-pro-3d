import type { LucideIcon } from "lucide-react";
import {
  Calculator,
  LineChart,
  ShoppingCart,
  Box,
  Layers,
  FlaskConical,
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
  Target,
} from "lucide-react";

export type NavLinkItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavGroup = {
  id: string;
  label: string;
  links: NavLinkItem[];
};

/** Links sempre visíveis no topo */
export const topNavLinks: NavLinkItem[] = [
  { href: "/", label: "Dashboard", icon: LineChart },
  { href: "/alertas", label: "Alertas", icon: Bell },
];

/** Grupos colapsáveis */
export const navGroups: NavGroup[] = [
  {
    id: "precificacao",
    label: "Precificação",
    links: [
      { href: "/calculator", label: "Calculadora de markup", icon: Calculator },
      { href: "/margem-certa", label: "Margem certa", icon: Target },
      { href: "/orcamentos", label: "Orçamentos", icon: FileText },
      { href: "/promocoes", label: "Promoções", icon: Percent },
    ],
  },
  {
    id: "producao",
    label: "Produção",
    links: [
      { href: "/products", label: "Produtos", icon: Box },
      { href: "/inventory", label: "Peças produzidas", icon: Layers },
      { href: "/ordens", label: "Ordens de produção", icon: Printer },
      { href: "/impressoras", label: "Impressoras", icon: Printer },
      { href: "/insumos", label: "Insumos", icon: FlaskConical },
      { href: "/fornecedores", label: "Fornecedores", icon: Store },
    ],
  },
  {
    id: "vendas",
    label: "Vendas",
    links: [
      { href: "/sales", label: "Vendas", icon: ShoppingCart },
      { href: "/reports", label: "Relatórios", icon: LineChart },
      { href: "/catalogo", label: "Catálogo", icon: LayoutGrid },
    ],
  },
];

/** Links secundários — acima do divisor */
export const secondaryNavLinksBeforeDivider: NavLinkItem[] = [
  { href: "/tutorial", label: "Tutorial", icon: GraduationCap },
  { href: "/suporte", label: "Suporte", icon: MessageCircle },
];

/** Links secundários — abaixo do divisor */
export const secondaryNavLinksAfterDivider: NavLinkItem[] = [
  { href: "/pricing", label: "Assinaturas", icon: CreditCard },
  { href: "/conta", label: "Conta", icon: User },
  { href: "/settings", label: "Configurações", icon: Settings },
];

/** Flat list para mobile nav */
export const mobileNavLinksFlat: { href: string; label: string }[] = [
  ...topNavLinks.map(({ href, label }) => ({ href, label })),
  ...navGroups.flatMap((g) => g.links.map(({ href, label }) => ({ href, label }))),
  ...secondaryNavLinksBeforeDivider.map(({ href, label }) => ({ href, label })),
  ...secondaryNavLinksAfterDivider.map(({ href, label }) => ({ href, label })),
];

// kept for backward-compat with any direct imports
export const primaryNavLinks = [
  ...topNavLinks,
  ...navGroups.flatMap((g) => g.links),
];
