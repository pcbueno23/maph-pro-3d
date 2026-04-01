import Link from "next/link";
import Image from "next/image";
import { CountUp } from "../components/CountUp";
import { FaqAccordion } from "../components/FaqAccordion";
import { MobileNav } from "../components/MobileNav";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.maphpro3d.com";
const APP_BASE_URL = APP_URL.replace(/\/$/, "");
const APP_LOGIN_URL = `${APP_BASE_URL}/login`;
const APP_SIGNUP_URL = `${APP_BASE_URL}/login?signup=1`;
const APP_CALC_URL = `${APP_BASE_URL}/calculadora-gratuita`;

// ─── Ícones SVG inline ────────────────────────────────────────────────────────
const IconCalc = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
    <rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="10" y2="10" /><line x1="14" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="10" y2="14" /><line x1="14" y1="14" x2="16" y2="14" /><line x1="8" y1="18" x2="16" y2="18" />
  </svg>
);
const IconPrinter = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
    <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
  </svg>
);
const IconBox = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);
const IconChart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
  </svg>
);
const IconFile = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);
const IconBell = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const IconShop = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);
const IconOrders = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
    <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

// ─── Componente BantCard removido — substituído por seção melhor ──────────────

export default function Home() {
  const faqItems = [
    {
      q: "Preciso instalar algo?",
      a: "Não. O Maph Pro 3D roda 100% no navegador — PC, celular ou tablet. Também pode ser instalado como PWA na tela inicial do Android (Chrome) e iPhone (Safari), sem precisar de loja de apps.",
    },
    {
      q: "Como funciona o período de teste?",
      a: "Ao criar sua conta você recebe 7 dias com acesso completo ao plano Pro, sem precisar de cartão de crédito. Depois do trial você escolhe o plano que faz mais sentido para o seu momento.",
    },
    {
      q: "A calculadora realmente calcula as taxas da Shopee e do ML?",
      a: "Sim. O motor de cálculo aplica as tabelas reais de comissão + taxa fixa da Shopee e do Mercado Livre, variando por faixa de preço, tipo de anúncio e CPF/CNPJ. Você vê o lucro líquido antes de anunciar.",
    },
    {
      q: "O orçamento em PDF sai com minha marca?",
      a: "Sim. Cadastre logo e dados da empresa em Conta; o PDF gerado usa essas informações no cabeçalho, profissionalizando o atendimento ao cliente.",
    },
    {
      q: "Funciona para quem vende direto (Instagram, WhatsApp)?",
      a: "Sim. O canal 'Venda Direta' calcula preço para PIX e cartão com taxas de gateway configuráveis — independente de marketplace.",
    },
    {
      q: "Posso usar sendo MEI ou pessoa física (CPF)?",
      a: "Sim. Na calculadora você define CPF ou CNPJ; isso afeta as taxas do marketplace e o cálculo de imposto. Tudo configurável para refletir sua realidade.",
    },
  ];

  const tools = [
    {
      icon: <IconCalc />,
      color: "cyan",
      name: "Calculadora de Markup",
      desc: "Custo real por peça: filamento, energia, depreciação, embalagem, falha e mão de obra — preço por Shopee, ML e venda direta.",
    },
    {
      icon: <IconPrinter />,
      color: "purple",
      name: "Gestão de Impressoras",
      desc: "Cadastre suas máquinas com custo, potência e vida útil. Os dados alimentam o cálculo automaticamente.",
    },
    {
      icon: <IconBox />,
      color: "emerald",
      name: "Controle de Insumos",
      desc: "Histórico de filamentos e materiais com custo atualizado. Nunca mais calcule com preço desatualizado.",
    },
    {
      icon: <IconOrders />,
      color: "amber",
      name: "Ordens de Produção",
      desc: "Do pedido à entrega: crie, acompanhe e finalize ordens com status em tempo real.",
    },
    {
      icon: <IconFile />,
      color: "cyan",
      name: "Orçamentos em PDF",
      desc: "Gere orçamentos com sua logo e dados da empresa em segundos. Clientes param de pechinchar quando veem o documento.",
    },
    {
      icon: <IconChart />,
      color: "emerald",
      name: "Relatórios e Dashboard",
      desc: "Lucro bruto, líquido e desempenho por canal. Saiba exatamente se o mês fechou no verde.",
    },
    {
      icon: <IconShop />,
      color: "purple",
      name: "Registro de Vendas",
      desc: "Registre vendas por Shopee, ML e venda direta. Painel centralizado com receita e margem por canal.",
    },
    {
      icon: <IconBell />,
      color: "amber",
      name: "Alertas Inteligentes",
      desc: "Avisa quando insumo está acabando, margem caiu ou você tem produtos sem precificação atualizada.",
    },
  ];

  const colorMap: Record<string, string> = {
    cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Grid background sutil */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.055]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10">
        {/* ═══════════════════════════════════════════
            HEADER
        ═══════════════════════════════════════════ */}
        <header className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
            <Link href="#" className="flex items-center gap-2.5">
              <div className="relative h-8 w-8 overflow-hidden rounded-lg sm:h-9 sm:w-9">
                <Image src="/logo.png" alt="Maph Pro 3D" width={36} height={36} className="h-full w-full object-contain" />
              </div>
              <span className="text-base font-bold tracking-tight text-slate-50 sm:text-lg">
                Maph Pro <span className="text-cyan-400">3D</span>
              </span>
            </Link>

            <nav className="hidden items-center gap-6 md:flex">
              {[
                { href: "#ferramentas", label: "Ferramentas" },
                { href: "#prova", label: "Resultados" },
                { href: "#precos", label: "Preços" },
                { href: "#faq", label: "FAQ" },
              ].map((l) => (
                <a key={l.href} href={l.href} className="text-sm text-slate-400 transition hover:text-cyan-400">
                  {l.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2.5">
              <Link
                href={APP_LOGIN_URL}
                className="hidden rounded-full border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-slate-100 md:inline-flex"
              >
                Entrar
              </Link>
              <Link
                href={APP_SIGNUP_URL}
                className="rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-emerald-400"
              >
                Começar grátis
              </Link>
              <MobileNav appLoginUrl={APP_LOGIN_URL} appSignupUrl={APP_SIGNUP_URL} docsUrl={null} />
            </div>
          </div>
        </header>

        {/* ═══════════════════════════════════════════
            HERO
        ═══════════════════════════════════════════ */}
        <section className="relative mx-auto max-w-6xl px-4 pb-16 pt-20 text-center sm:px-6 sm:pb-24 sm:pt-28 lg:px-8 lg:pb-32 lg:pt-36">
          {/* Glow decorativo atrás do título */}
          <div
            className="pointer-events-none absolute left-1/2 top-1/4 -z-10 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20"
            style={{ background: "radial-gradient(ellipse, rgba(34,211,238,0.35) 0%, transparent 70%)" }}
          />

          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
            <span className="text-xs font-semibold tracking-wide text-cyan-300">
              Calculadora pública disponível — teste agora, sem cadastro
            </span>
          </div>

          <h1 className="mt-2 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-50 sm:text-5xl lg:text-6xl">
            Você sabe que está{" "}
            <span className="bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent">
              perdendo dinheiro.
            </span>
            <br className="hidden sm:block" />
            {" "}O Maph Pro 3D mostra{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              exatamente onde.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
            Calculadora de markup com taxas reais de Shopee e Mercado Livre, gestão de impressoras, insumos, ordens de produção, vendas, orçamentos em PDF e relatórios — tudo em um lugar só.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={APP_SIGNUP_URL}
              className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-8 py-4 text-center text-base font-bold text-slate-950 shadow-xl shadow-cyan-500/25 transition hover:from-cyan-400 hover:to-emerald-400 sm:w-auto"
            >
              Começar teste grátis — 7 dias sem cartão
            </Link>
            <Link
              href={APP_CALC_URL}
              className="w-full rounded-2xl border border-slate-700 bg-slate-800/50 px-8 py-4 text-center text-base font-medium text-slate-300 transition hover:border-cyan-500/40 hover:bg-slate-800/80 sm:w-auto"
            >
              Testar calculadora grátis →
            </Link>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Sem cartão · Sem compromisso · Cancele quando quiser
          </p>

          {/* Stats */}
          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { n: 8, suf: "+", label: "custos calculados por peça" },
              { n: 3, suf: "", label: "canais: Shopee, ML e direto" },
              { n: 7, suf: " dias", label: "de teste grátis, sem cartão" },
              { n: 100, suf: "%", label: "online — PC e celular" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 text-left">
                <p className="text-2xl font-extrabold tracking-tight text-slate-50">
                  <CountUp to={s.n} suffix={s.suf} />
                </p>
                <p className="mt-1 text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            PLATAFORMAS SUPORTADAS
        ═══════════════════════════════════════════ */}
        <div className="border-y border-slate-800/60 bg-slate-900/30 py-5">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3 px-4 sm:gap-6">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-600">Calcula taxas de</span>
            {["Shopee", "Mercado Livre", "Venda Direta PIX", "Venda Direta Cartão"].map((p) => (
              <span key={p} className="rounded-full border border-slate-700/80 bg-slate-800/40 px-4 py-1.5 text-sm font-medium text-slate-300">
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            DOR — ANTES / DEPOIS
        ═══════════════════════════════════════════ */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">A realidade que ninguém fala</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">
                Do achismo ao preço{" "}
                <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                  com método
                </span>
              </h2>
              <p className="mt-4 text-base text-slate-400">
                A maioria dos makers perde entre 15% e 40% do lucro em custos que nunca entram na conta.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] p-7">
                <p className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-rose-400">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/20 text-rose-300">✕</span>
                  Sem o Maph Pro 3D
                </p>
                <ul className="space-y-4">
                  {[
                    "Preço calculado no feeling — sem saber o custo real",
                    "Taxa de falha ignorada: peça quebra no final e você absorve",
                    "Comissão do marketplace entra na conta só quando a fatura chega",
                    "Depreciação da impressora nunca calculada",
                    "Cada orçamento feito do zero, sem padrão ou marca",
                    "Fim do mês: não sabe se lucrou ou teve prejuízo",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-slate-400">
                      <span className="mt-0.5 shrink-0 text-rose-500/60">—</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-7">
                <p className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">✓</span>
                  Com o Maph Pro 3D
                </p>
                <ul className="space-y-4">
                  {[
                    "Custo real por peça: filamento, energia, embalagem e depreciação",
                    "Taxa de falha embutida no preço — margem protegida mesmo quando falha",
                    "Taxas Shopee, ML e cartão calculadas antes de você anunciar",
                    "Preço mínimo e sugerido por canal em menos de 5 minutos",
                    "Orçamento em PDF com sua logo gerado em segundos",
                    "Dashboard: lucro bruto, líquido e desempenho por canal",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                      <span className="mt-0.5 shrink-0 text-emerald-400">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            FERRAMENTAS — GRID COMPLETO
        ═══════════════════════════════════════════ */}
        <section id="ferramentas" className="border-t border-slate-800/60 bg-slate-900/20 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">Plataforma completa</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">
                Não é só uma calculadora.
                <br />
                <span className="text-slate-400">É o seu negócio de ponta a ponta.</span>
              </h2>
              <p className="mt-4 text-base text-slate-400">
                8 ferramentas integradas para precificar, produzir, vender e crescer — sem planilha, sem achismo.
              </p>
            </div>

            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {tools.map((t) => (
                <div
                  key={t.name}
                  className="group rounded-2xl border border-slate-800/80 bg-slate-950/60 p-5 transition hover:border-slate-700 hover:bg-slate-950/80"
                >
                  <div className={`mb-4 inline-flex rounded-xl border p-2.5 ${colorMap[t.color]}`}>
                    {t.icon}
                  </div>
                  <h3 className="text-sm font-bold text-slate-100">{t.name}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">{t.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link
                href={APP_SIGNUP_URL}
                className="inline-flex rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-8 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-emerald-400"
              >
                Acessar todas as ferramentas grátis por 7 dias →
              </Link>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            CALCULADORA GRATUITA — DESTAQUE
        ═══════════════════════════════════════════ */}
        <section className="border-t border-slate-800/60 py-20 sm:py-28">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-3xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/5 via-slate-950 to-emerald-500/5">
              <div className="grid items-center gap-8 p-8 sm:p-12 lg:grid-cols-2">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-cyan-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    Sem precisar criar conta
                  </span>
                  <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-50 sm:text-3xl">
                    Calculadora gratuita disponível agora
                  </h2>
                  <p className="mt-3 text-base leading-relaxed text-slate-400">
                    Quer ver como funciona antes de criar conta? Use a calculadora pública — sem cadastro, sem cartão. Calcule custo real, margem e preço sugerido para Shopee, Mercado Livre e venda direta em minutos.
                  </p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <Link
                      href={APP_CALC_URL}
                      className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-emerald-400"
                    >
                      Usar calculadora grátis →
                    </Link>
                    <Link
                      href={APP_SIGNUP_URL}
                      className="rounded-xl border border-slate-700 bg-slate-800/50 px-6 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800"
                    >
                      Criar conta completa
                    </Link>
                  </div>
                </div>
                <div className="hidden lg:block">
                  <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Na calculadora grátis você tem</p>
                    {[
                      "Custo de filamento, energia e depreciação",
                      "Taxas reais de Shopee e Mercado Livre",
                      "Preço sugerido e preço mínimo por canal",
                      "Margem de lucro real calculada",
                      "Venda direta: PIX e cartão com gateway",
                    ].map((f) => (
                      <div key={f} className="flex items-center gap-3 rounded-xl border border-slate-800/60 bg-slate-900/50 px-3 py-2.5">
                        <span className="text-emerald-400 text-sm">✓</span>
                        <span className="text-xs text-slate-300">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            PROVA SOCIAL
        ═══════════════════════════════════════════ */}
        <section id="prova" className="border-t border-slate-800/60 bg-slate-900/20 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <p className="mb-10 text-center text-xs font-bold uppercase tracking-widest text-slate-500">
              Quem usa o Maph Pro 3D
            </p>
            <div className="grid gap-5 sm:grid-cols-3">
              {[
                {
                  quote: "Antes eu chutava o preço e ficava no zero a zero. Agora em 5 minutos tenho o preço mínimo, o ideal e a margem de cada canal. Nunca mais vendi no prejuízo sem perceber.",
                  name: "Rafael M.",
                  role: "Impressão 3D para e-commerce",
                  channel: "Shopee",
                  initial: "R",
                  color: "from-cyan-500 to-blue-500",
                },
                {
                  quote: "O PDF de orçamento com minha logo profissionalizou muito o atendimento. Clientes param de pechinchar quando veem o documento. Mais de 60% dos orçamentos viram vendas.",
                  name: "Camila S.",
                  role: "Lab 3D — cosplay e miniaturas",
                  channel: "Venda direta",
                  initial: "C",
                  color: "from-emerald-500 to-teal-500",
                },
                {
                  quote: "A calculadora com taxa de falha foi o diferencial. Eu não colocava esse custo no preço e perdia dinheiro em peças longas. Desde que uso o Maph, minha margem real subiu 12 pontos.",
                  name: "Douglas F.",
                  role: "Peças técnicas e protótipos",
                  channel: "Mercado Livre",
                  initial: "D",
                  color: "from-purple-500 to-pink-500",
                },
              ].map((t) => (
                <div key={t.name} className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
                  {/* Estrelas */}
                  <div className="mb-4 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="text-amber-400 text-sm">★</span>
                    ))}
                  </div>
                  <p className="flex-1 text-sm leading-relaxed text-slate-300">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-5 flex items-center gap-3 border-t border-slate-800/60 pt-4">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${t.color} text-sm font-bold text-white`}>
                      {t.initial}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{t.name}</p>
                      <p className="text-[11px] text-slate-500">{t.role} · {t.channel}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            PREÇOS
        ═══════════════════════════════════════════ */}
        <section id="precos" className="border-t border-slate-800/60 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-xl text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Planos</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">
                Simples e sem surpresa
              </h2>
              <p className="mt-4 text-base text-slate-400">
                Comece com 7 dias de trial do Pro, sem cartão. Assine quando — e se — fizer sentido.
              </p>
            </div>

            <div className="mx-auto mt-12 grid max-w-4xl gap-5 sm:grid-cols-3">
              {/* Free */}
              <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
                <p className="text-sm font-semibold text-slate-400">Free</p>
                <p className="mt-4 text-4xl font-extrabold tracking-tight text-slate-50">R$ 0</p>
                <p className="mt-1 text-sm text-slate-500">para sempre</p>
                <p className="mt-3 text-sm text-slate-400">Calculadora básica após o trial.</p>
                <Link
                  href={APP_SIGNUP_URL}
                  className="mt-8 block rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-center text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-900"
                >
                  Começar grátis
                </Link>
              </div>

              {/* Pro Mensal */}
              <div className="flex flex-col rounded-2xl border border-cyan-500/35 bg-slate-900/80 p-6 shadow-lg shadow-cyan-500/10">
                <p className="text-sm font-semibold text-cyan-400">Pro mensal</p>
                <p className="mt-4 text-4xl font-extrabold tracking-tight text-slate-50">R$ 29,90</p>
                <p className="mt-1 text-sm text-slate-500">/mês · cancele quando quiser</p>
                <p className="mt-3 text-sm text-slate-400">Todas as ferramentas sem limite.</p>
                <Link
                  href={`${APP_BASE_URL}/pricing`}
                  className="mt-8 block rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-center text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/15"
                >
                  Assinar mensal
                </Link>
              </div>

              {/* Business Anual — destaque */}
              <div className="relative flex flex-col overflow-hidden rounded-2xl border-2 border-emerald-500/50 bg-slate-900/80 p-6 shadow-[0_0_60px_-20px_rgba(52,211,153,0.35)]">
                <div className="absolute right-4 top-4 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-950">
                  Melhor custo
                </div>
                <p className="text-sm font-semibold text-emerald-400">Business anual</p>
                <p className="mt-4 text-4xl font-extrabold tracking-tight text-slate-50">R$ 199,90</p>
                <p className="mt-1 text-sm text-slate-500">/ano · ~R$ 16,66/mês</p>
                <p className="mt-3 text-sm font-semibold text-emerald-400">Você economiza R$ 158,90 por ano.</p>
                <Link
                  href={`${APP_BASE_URL}/pricing`}
                  className="mt-8 block rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-center text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:from-emerald-400 hover:to-teal-400"
                >
                  Assinar anual e economizar
                </Link>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-slate-600">
              Todos os planos incluem 7 dias de trial completo. Sem cartão para começar.
            </p>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            CTA INTERMEDIÁRIO — URGÊNCIA
        ═══════════════════════════════════════════ */}
        <section className="border-t border-slate-800/60 bg-gradient-to-br from-cyan-500/5 via-slate-950 to-emerald-500/5 py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">
              Cada venda sem cálculo correto{" "}
              <span className="bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent">
                é dinheiro deixado para trás.
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base text-slate-400">
              Não precisa de cartão. Não precisa de configuração complexa. Em 5 minutos você tem o preço certo para Shopee, ML e venda direta.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href={APP_SIGNUP_URL}
                className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-8 py-4 text-center text-base font-bold text-slate-950 shadow-xl shadow-cyan-500/25 transition hover:from-cyan-400 hover:to-emerald-400 sm:w-auto"
              >
                Começar meu teste grátis agora
              </Link>
              <Link
                href={APP_CALC_URL}
                className="w-full rounded-2xl border border-slate-700 bg-slate-800/50 px-8 py-4 text-center text-sm font-medium text-slate-300 transition hover:border-cyan-500/40 sm:w-auto"
              >
                Só quero a calculadora por ora
              </Link>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            FAQ
        ═══════════════════════════════════════════ */}
        <section id="faq" className="border-t border-slate-800/60 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Dúvidas frequentes</p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-50 sm:text-3xl">
                Perguntas e respostas
              </h2>
            </div>
            <FaqAccordion items={faqItems} />
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            CTA FINAL
        ═══════════════════════════════════════════ */}
        <section className="border-t border-slate-800/60 bg-slate-900/30 py-20 sm:py-28">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-10 sm:p-14">
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">Comece hoje</p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">
                Seu próximo produto já merece um preço correto.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base text-slate-400">
                Crie sua conta grátis, configure em 5 minutos e use todas as ferramentas por 7 dias sem custo.
              </p>
              <Link
                href={APP_SIGNUP_URL}
                className="mt-8 inline-flex rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-10 py-4 text-base font-bold text-slate-950 shadow-xl shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-emerald-400"
              >
                Criar conta grátis agora →
              </Link>
              <p className="mt-4 text-xs text-slate-600">
                Sem cartão · 7 dias de trial · Cancele quando quiser
              </p>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            FOOTER
        ═══════════════════════════════════════════ */}
        <footer className="border-t border-slate-800/60 py-10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <Link href="#" className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-400">
                  Maph Pro <span className="text-cyan-400">3D</span>
                </span>
              </Link>
              <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-slate-600">
                <Link href={`${APP_BASE_URL}/termos`} className="transition hover:text-slate-400">Termos de uso</Link>
                <Link href={`${APP_BASE_URL}/privacidade`} className="transition hover:text-slate-400">Privacidade</Link>
                <Link href={`${APP_BASE_URL}/pricing`} className="transition hover:text-slate-400">Planos</Link>
                <Link href={APP_CALC_URL} className="transition hover:text-slate-400">Calculadora grátis</Link>
                <Link href={APP_LOGIN_URL} className="transition hover:text-slate-400">Entrar</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
