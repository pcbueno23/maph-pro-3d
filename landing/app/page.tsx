import Link from "next/link";
import Image from "next/image";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://maph-pro-3d-8hgw.vercel.app";
const DOCS_URL =
  process.env.NEXT_PUBLIC_DOCS_URL ?? null;
const APP_BASE_URL = APP_URL.replace(/\/$/, "");
const APP_LOGIN_URL = `${APP_BASE_URL}/login`;
const APP_SIGNUP_URL = `${APP_BASE_URL}/login?signup=1`;
const LEAD_MAGNET_URL = "/checklist-precificacao-3d.txt";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Grid background */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.06]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10">
        {/* ========== HEADER ========== */}
        <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <Link href="#" className="flex items-center gap-2">
              <div className="relative h-9 w-9 overflow-hidden rounded-xl sm:h-10 sm:w-10">
                <Image
                  src="/logo.png"
                  alt="Maph Pro 3D"
                  width={40}
                  height={40}
                  className="h-9 w-9 object-contain sm:h-10 sm:w-10"
                />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-50 sm:text-xl">
                Maph Pro <span className="text-cyan-400">3D</span>
              </span>
            </Link>
            <nav className="hidden items-center gap-8 md:flex">
              <a href="#oferta" className="text-sm text-slate-400 hover:text-cyan-400">
                Oferta
              </a>
              <a href="#recursos" className="text-sm text-slate-400 hover:text-cyan-400">
                Recursos
              </a>
              <a href="#precos" className="text-sm text-slate-400 hover:text-cyan-400">
                Preços
              </a>
              <a href="#qualificacao" className="text-sm text-slate-400 hover:text-cyan-400">
                Diagnóstico
              </a>
              <a href="#faq" className="text-sm text-slate-400 hover:text-cyan-400">
                FAQ
              </a>
              {DOCS_URL ? (
                <Link
                  href={DOCS_URL}
                  className="text-sm text-slate-400 hover:text-cyan-400"
                >
                  Documentação
                </Link>
              ) : (
                <a
                  href="#docs"
                  className="text-sm text-slate-400 hover:text-cyan-400"
                >
                  Primeiros passos
                </a>
              )}
            </nav>
            <div className="flex items-center gap-3">
              <Link
                href={APP_LOGIN_URL}
                className="rounded-full border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
              >
                Entrar
              </Link>
              <Link
                href={APP_SIGNUP_URL}
                className="rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-emerald-400"
              >
                Teste grátis
              </Link>
            </div>
          </div>
        </header>

        {/* ========== HERO ========== */}
        <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
            Chega de preço no chute
          </p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-50 sm:text-5xl lg:text-6xl">
            Calcule o preço certo da sua impressão 3D em minutos.{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Proteja sua margem em cada venda.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
            O Maph Pro 3D transforma seus custos reais em preço de venda com lucro,
            considerando material, energia, tempo, depreciação, taxas e impostos.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={APP_SIGNUP_URL}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-8 py-4 text-center text-base font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 transition hover:from-cyan-400 hover:to-emerald-400 sm:w-auto"
            >
              Começar teste grátis
            </Link>
            <a
              href={LEAD_MAGNET_URL}
              download="checklist-precificacao-3d.txt"
              className="w-full rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-8 py-4 text-center text-base font-medium text-cyan-200 transition hover:bg-cyan-500/15 sm:w-auto"
            >
              Baixar checklist grátis
            </a>
            <a
              href="#recursos"
              className="w-full rounded-xl border border-slate-600 bg-slate-800/50 px-8 py-4 text-center text-base font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800/80 sm:w-auto"
            >
              Ver recursos
            </a>
          </div>
        </section>

        {/* ========== OFERTA IRRESISTÍVEL ========== */}
        <section id="oferta" className="border-t border-slate-800/80 bg-slate-900/30 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold text-slate-50 sm:text-4xl">
                Uma ideia central: vender com lucro previsível
              </h2>
              <p className="mt-4 text-slate-400">
                Em vez de dezenas de promessas, focamos em um resultado: você saber o preço mínimo e o preço ideal antes de anunciar.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                "Calcula custo real por peça (não só filamento).",
                "Considera energia, embalagem e depreciação.",
                "Inclui taxa de falha para custo realista.",
                "Simula Shopee, Mercado Livre, PIX e cartão.",
                "Mostra lucro líquido e margem final.",
                "Compara com preço de mercado em segundos.",
                "Evita vender abaixo do custo sem perceber.",
                "Organiza produtos, ordens e vendas no mesmo app.",
                "Gera orçamento em PDF com sua marca.",
                "Sincroniza na nuvem para continuar de onde parou.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== RECURSOS (organizado por área) ========== */}
        <section id="recursos" className="border-t border-slate-800/80 bg-slate-900/30 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-slate-50 sm:text-4xl">
                O que o app faz hoje
              </h2>
              <p className="mt-3 text-slate-400">
                Da simulação de preço à gestão do dia a dia do seu laboratório 3D.
              </p>
            </div>

            {/* Precificação */}
            <h3 className="mt-14 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
              Precificação
            </h3>
            <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: "Calculadora completa",
                  description:
                    "Filamento, energia, depreciação, embalagem, frete e margem. Ajustes avançados: taxa de falha, mão de obra e desconto real com lucro líquido e margem real.",
                  icon: "🧮",
                },
                {
                  title: "Shopee e Mercado Livre",
                  description:
                    "Comissões configuráveis, frete grátis na Shopee, CPF ou CNPJ, preço sugerido e mínimo por canal.",
                  icon: "🛒",
                },
                {
                  title: "PIX e cartão direto",
                  description:
                    "Sugestão de preço para venda fora do marketplace, com taxa de cartão configurável.",
                  icon: "💳",
                },
                {
                  title: "Produtos salvos",
                  description:
                    "Transforme simulações em produtos com ficha, imagem e histórico para reutilizar na operação.",
                  icon: "📦",
                },
              ].map((item) => (
                <FeatureCard key={item.title} {...item} />
              ))}
            </div>

            {/* Operação */}
            <h3 className="mt-14 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
              Produção e estoque
            </h3>
            <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: "Dashboard operacional",
                  description:
                    "Visão de ordens, uso de impressoras e vendas com filtros por período (hoje, 7 e 30 dias).",
                  icon: "📊",
                },
                {
                  title: "Ordens e impressoras",
                  description:
                    "Ordens de produção ligadas a produtos e impressoras cadastradas com custos reais para a calculadora.",
                  icon: "🖨️",
                },
                {
                  title: "Insumos e movimentações",
                  description:
                    "Controle de materiais com histórico de entradas e saídas.",
                  icon: "🧵",
                },
                {
                  title: "Peças produzidas",
                  description:
                    "Acompanhe o que já saiu da impressora e integre com o fluxo de produtos.",
                  icon: "✅",
                },
              ].map((item) => (
                <FeatureCard key={item.title} {...item} />
              ))}
            </div>

            {/* Comercial */}
            <h3 className="mt-14 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
              Vendas e documentos
            </h3>
            <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: "Vendas",
                  description:
                    "Registre vendas por canal e acompanhe receita no painel.",
                  icon: "💰",
                },
                {
                  title: "Orçamentos em PDF",
                  description:
                    "Gere orçamento com itens e totais; o PDF usa logo e dados da empresa salvos em Conta.",
                  icon: "📄",
                },
                {
                  title: "Relatórios",
                  description:
                    "Visão consolidada de insumos, produção e indicadores para decisão.",
                  icon: "📈",
                },
                {
                  title: "Alertas",
                  description:
                    "Acompanhe avisos importantes da operação e da margem.",
                  icon: "🔔",
                },
              ].map((item) => (
                <FeatureCard key={item.title} {...item} />
              ))}
            </div>

            {/* Conta, PWA, tutorial */}
            <h3 className="mt-14 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
              Conta e experiência
            </h3>
            <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: "Conta e empresa",
                  description:
                    "Dados pessoais, dados da empresa, logo e segurança (senha) em um só lugar.",
                  icon: "👤",
                },
                {
                  title: "PWA no celular",
                  description:
                    "Use no navegador ou instale como app (Android e iPhone) com layout responsivo.",
                  icon: "📱",
                },
                {
                  title: "Tutorial no app",
                  description:
                    "Tour em 5 passos, um de cada vez, para configurar e usar o fluxo completo.",
                  icon: "🎓",
                },
                {
                  title: "Configurações",
                  description:
                    "Margem padrão, moeda, presets de comissão e preferências alinhadas à calculadora.",
                  icon: "⚙️",
                },
              ].map((item) => (
                <FeatureCard key={item.title} {...item} />
              ))}
            </div>
          </div>
        </section>

        {/* ========== PREÇOS ========== */}
        <section id="precos" className="border-t border-slate-800/80 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-slate-50 sm:text-4xl">
                Planos simples
              </h2>
              <p className="mt-4 text-lg text-slate-400">
                Comece com trial do Pro e escolha o que combina com o seu momento.
              </p>
            </div>
            <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-3">
              {[
                {
                  name: "Free",
                  price: "R$ 0",
                  detail: "Inclui período de teste com acesso Pro.",
                  highlight: false,
                },
                {
                  name: "Pro",
                  price: "R$ 29,90",
                  detail: "Por mês · precificação e operação completas.",
                  highlight: true,
                },
                {
                  name: "Business",
                  price: "R$ 199,90/ano",
                  detail: "Plano anual · economia de 44% em relação ao mensal.",
                  highlight: false,
                },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-2xl border p-6 text-center ${
                    plan.highlight
                      ? "border-cyan-500/50 bg-slate-900/80 shadow-lg shadow-cyan-500/10"
                      : "border-slate-800 bg-slate-950/80"
                  }`}
                >
                  <p className="text-sm font-medium text-cyan-400">{plan.name}</p>
                  {plan.highlight ? (
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                      Plano padrão
                    </p>
                  ) : null}
                  <p className="mt-2 text-2xl font-bold text-slate-50">{plan.price}</p>
                  <p className="mt-2 text-sm text-slate-400">{plan.detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={`${APP_BASE_URL}/pricing`}
                className="inline-block rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-8 py-3.5 text-base font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-emerald-400"
              >
                Ver planos e assinar
              </Link>
              <Link
                href={APP_SIGNUP_URL}
                className="inline-block rounded-xl border border-slate-600 bg-slate-800/50 px-8 py-3.5 text-base font-medium text-slate-200 transition hover:border-cyan-500/50 hover:bg-slate-800"
              >
                Iniciar teste grátis
              </Link>
            </div>
          </div>
        </section>

        {/* ========== LEAD MAGNET ========== */}
        <section className="border-t border-slate-800/80 py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-500/10 to-slate-950/50 p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                Lead Magnet
              </p>
              <h3 className="mt-2 text-2xl font-bold text-slate-50">
                Checklist grátis: 12 erros que reduzem seu lucro na impressão 3D
              </h3>
              <p className="mt-3 text-sm text-slate-300">
                Material rápido para aplicar hoje e já corrigir precificação, taxa e margem.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <a
                  href={LEAD_MAGNET_URL}
                  download="checklist-precificacao-3d.txt"
                  className="inline-block rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3 text-center text-sm font-semibold text-slate-950 transition hover:from-cyan-400 hover:to-emerald-400"
                >
                  Baixar checklist grátis
                </a>
                <Link
                  href={APP_SIGNUP_URL}
                  className="inline-block rounded-xl border border-slate-600 bg-slate-900/60 px-6 py-3 text-center text-sm font-medium text-slate-200 transition hover:border-cyan-500/50"
                >
                  Criar conta e testar no app
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ========== USE ONDE QUISER + LINKS ========== */}
        <section className="border-t border-slate-800/80 bg-slate-900/30 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-2xl font-bold text-slate-50 sm:text-3xl">
              Use onde quiser
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-400">
              Navegador no computador ou celular, com opção de instalar como PWA.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-slate-500">
              {["PWA", "Chrome / Safari", "Android / iPhone", "Desktop"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-xl border border-slate-700 bg-slate-800/50 px-5 py-2.5 text-sm font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href={`${APP_BASE_URL}/tutorial`}
                className="group rounded-2xl border border-slate-800 bg-slate-950/80 p-6 transition hover:border-cyan-500/40"
              >
                <h3 className="text-lg font-semibold text-slate-100 group-hover:text-cyan-400">
                  Tutorial no app
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Passo a passo dentro do próprio sistema — ideal para a primeira
                  configuração.
                </p>
                <span className="mt-3 inline-block text-sm font-medium text-cyan-400">
                  Abrir tutorial →
                </span>
              </Link>
              {DOCS_URL ? (
                <Link
                  href={DOCS_URL}
                  className="group rounded-2xl border border-slate-800 bg-slate-950/80 p-6 transition hover:border-cyan-500/40"
                >
                  <h3 className="text-lg font-semibold text-slate-100 group-hover:text-cyan-400">
                    Documentação
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Guias e referência para aprofundar o uso.
                  </p>
                  <span className="mt-3 inline-block text-sm font-medium text-cyan-400">
                    Acessar documentação →
                  </span>
                </Link>
              ) : (
                <a
                  href="#docs"
                  className="group block rounded-2xl border border-slate-800 bg-slate-950/80 p-6 transition hover:border-cyan-500/40"
                >
                  <h3 className="text-lg font-semibold text-slate-100 group-hover:text-cyan-400">
                    Primeiros passos
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Documentação externa em breve; use o tutorial e a calculadora
                    no app.
                  </p>
                  <span className="mt-3 inline-block text-sm font-medium text-cyan-400">
                    Ler abaixo →
                  </span>
                </a>
              )}
              <Link
                href={APP_SIGNUP_URL}
                className="group rounded-2xl border border-slate-800 bg-slate-950/80 p-6 transition hover:border-cyan-500/40"
              >
                <h3 className="text-lg font-semibold text-slate-100 group-hover:text-cyan-400">
                  Calculadora
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Simule custos e preços por canal em minutos.
                </p>
                <span className="mt-3 inline-block text-sm font-medium text-cyan-400">
                  Abrir o app →
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* ========== PRIMEIROS PASSOS / DOCS ========== */}
        <section id="docs" className="border-t border-slate-800/80 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-50 sm:text-3xl">
              Por onde começar
            </h2>
            <p className="mt-4 text-slate-400">
              Recomendamos abrir o <strong className="text-slate-300">Tutorial</strong>{" "}
              no app (5 passos) e, em seguida, ajustar{" "}
              <strong className="text-slate-300">Configurações</strong> e{" "}
              <strong className="text-slate-300">Impressoras</strong> antes da primeira
              simulação na calculadora.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={`${APP_BASE_URL}/tutorial`}
                className="inline-block rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-emerald-400"
              >
                Abrir tutorial
              </Link>
              <Link
                href={APP_SIGNUP_URL}
                className="inline-block rounded-xl border border-slate-600 bg-slate-800/50 px-6 py-3 text-sm font-medium text-slate-200 transition hover:border-cyan-500/50 hover:bg-slate-800"
              >
                Criar conta grátis
              </Link>
            </div>
          </div>
        </section>

        {/* ========== VISÃO GERAL (3 pilares) ========== */}
        <section className="border-t border-slate-800/80 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-2xl font-bold text-slate-50 sm:text-3xl">
              Três pilares do Maph Pro 3D
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-400">
              Precificar com método, produzir com controle e vender com números claros.
            </p>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {[
                {
                  title: "Margem real",
                  description:
                    "Preço sugerido por canal com taxas, impostos e custos alinhados — incluindo cenários com ajustes avançados.",
                },
                {
                  title: "Operação organizada",
                  description:
                    "Dashboard, ordens, impressoras e insumos para saber o que produzir, com o quê e em que ordem.",
                },
                {
                  title: "Cliente e caixa",
                  description:
                    "Vendas registradas, orçamentos profissionais em PDF com a sua marca e relatórios para acompanhar resultado.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6"
                >
                  <h3 className="text-lg font-semibold text-slate-100">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== QUALIFICAÇÃO (BANT) ========== */}
        <section id="qualificacao" className="border-t border-slate-800/80 bg-slate-900/30 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-bold text-slate-50 sm:text-3xl">
                Diagnóstico rápido: o Maph Pro 3D é para você agora?
              </h2>
              <p className="mt-3 text-slate-400">
                Se você marcar “sim” para 3 ou mais pontos, vale iniciar o teste grátis hoje.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <BantCard
                title="B · Budget"
                question="Você já vende ou quer vender peças com ticket acima de R$ 30?"
              />
              <BantCard
                title="A · Authority"
                question="Você decide preço, desconto e canal de venda no seu negócio?"
              />
              <BantCard
                title="N · Need"
                question="Você já teve dúvida se estava lucrando de verdade em cada venda?"
              />
              <BantCard
                title="T · Timing"
                question="Você quer organizar sua precificação e operação nas próximas semanas?"
              />
            </div>
            <div className="mt-8 text-center">
              <Link
                href={APP_SIGNUP_URL}
                className="inline-block rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-8 py-3.5 text-base font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-emerald-400"
              >
                Quero iniciar meu teste grátis
              </Link>
            </div>
          </div>
        </section>

        {/* ========== FAQ ========== */}
        <section id="faq" className="border-t border-slate-800/80 bg-slate-900/30 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-2xl font-bold text-slate-50 sm:text-3xl">
              Perguntas frequentes
            </h2>
            <ul className="mt-12 space-y-6">
              {[
                {
                  q: "O que é o Maph Pro 3D?",
                  a: "É um SaaS para quem vende impressão 3D: calculadora de custos e preços por canal (Shopee, Mercado Livre, PIX e cartão), gestão de produtos, produção, insumos, vendas, orçamentos em PDF e painéis para acompanhar a operação.",
                },
                {
                  q: "Como funcionam os planos?",
                  a: "Há um plano Free, o Pro mensal e o Business em formato anual (melhor custo por mês). No app, em Planos, você vê valores atualizados, trial quando disponível e pode gerenciar assinatura.",
                },
                {
                  q: "Funciona no celular?",
                  a: "Sim. O app é responsivo e pode ser instalado como PWA na tela inicial no Android (Chrome) e no iPhone (Safari).",
                },
                {
                  q: "O PDF do orçamento pode ter minha marca?",
                  a: "Sim. Cadastre logo e dados da empresa na aba Conta no app; o orçamento em PDF usa essas informações no cabeçalho.",
                },
                {
                  q: "Posso usar com CPF?",
                  a: "Sim. Na calculadora você define pessoa física ou jurídica para refletir melhor as regras de marketplace; venda direta continua configurável.",
                },
              ].map((item) => (
                <li
                  key={item.q}
                  className="rounded-xl border border-slate-800 bg-slate-950/80 p-5"
                >
                  <h3 className="font-semibold text-slate-100">{item.q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {item.a}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ========== CTA FINAL ========== */}
        <section className="border-t border-slate-800/80 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-50 sm:text-3xl">
              Pronto para precificar com método?
            </h2>
            <p className="mt-3 text-slate-400">
              Entre no app, siga o tutorial e faça sua primeira simulação com os seus
              custos reais.
            </p>
            <Link
              href={APP_SIGNUP_URL}
              className="mt-6 inline-block rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-8 py-4 text-base font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 transition hover:from-cyan-400 hover:to-emerald-400"
            >
              Iniciar teste grátis
            </Link>
          </div>
        </section>

        {/* ========== FOOTER ========== */}
        <footer className="border-t border-slate-800 bg-slate-950 py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Conta
                </h4>
                <ul className="mt-3 space-y-2">
                  <li>
                    <Link
                      href={APP_LOGIN_URL}
                      className="text-sm text-slate-400 hover:text-cyan-400"
                    >
                      Entrar
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={APP_SIGNUP_URL}
                      className="text-sm text-slate-400 hover:text-cyan-400"
                    >
                      Teste grátis
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`${APP_BASE_URL}/conta`}
                      className="text-sm text-slate-400 hover:text-cyan-400"
                    >
                      Conta (app)
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Produto
                </h4>
                <ul className="mt-3 space-y-2">
                  <li>
                    <a href="#recursos" className="text-sm text-slate-400 hover:text-cyan-400">
                      Recursos
                    </a>
                  </li>
                  <li>
                    <a href="#precos" className="text-sm text-slate-400 hover:text-cyan-400">
                      Preços
                    </a>
                  </li>
                  <li>
                    <Link
                      href={`${APP_BASE_URL}/tutorial`}
                      className="text-sm text-slate-400 hover:text-cyan-400"
                    >
                      Tutorial (app)
                    </Link>
                  </li>
                  <li>
                    {DOCS_URL ? (
                      <Link
                        href={DOCS_URL}
                        className="text-sm text-slate-400 hover:text-cyan-400"
                      >
                        Documentação
                      </Link>
                    ) : (
                      <a href="#docs" className="text-sm text-slate-400 hover:text-cyan-400">
                        Primeiros passos
                      </a>
                    )}
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Website
                </h4>
                <ul className="mt-3 space-y-2">
                  <li>
                    <a href="#faq" className="text-sm text-slate-400 hover:text-cyan-400">
                      FAQ
                    </a>
                  </li>
                  <li>
                    <Link
                      href={APP_BASE_URL}
                      className="text-sm text-slate-400 hover:text-cyan-400"
                    >
                      App
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`${APP_BASE_URL}/pricing`}
                      className="text-sm text-slate-400 hover:text-cyan-400"
                    >
                      Planos (app)
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Maph Pro 3D
                </h4>
                <p className="mt-3 text-sm text-slate-400">
                  Precificação, produção e vendas para o seu negócio de impressão 3D.
                </p>
              </div>
            </div>
            <div className="mt-12 border-t border-slate-800 pt-8 text-center text-sm text-slate-500">
              © {new Date().getFullYear()} Maph Pro 3D
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 backdrop-blur-sm transition hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5">
      <span className="text-3xl" aria-hidden>
        {icon}
      </span>
      <h3 className="mt-4 text-lg font-semibold text-slate-100">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
    </div>
  );
}

function BantCard({ title, question }: { title: string; question: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
        {title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{question}</p>
    </div>
  );
}
