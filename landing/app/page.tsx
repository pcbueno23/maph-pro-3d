import Link from "next/link";
import Image from "next/image";
import { CountUp } from "../components/CountUp";
import { FeatureTabs } from "../components/FeatureTabs";
import { FaqAccordion } from "../components/FaqAccordion";
import { PricingQuiz } from "../components/PricingQuiz";
import { MobileNav } from "../components/MobileNav";
import { ProductMockup } from "../components/ProductMockup";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://app.maphpro3d.com";
const DOCS_URL =
  process.env.NEXT_PUBLIC_DOCS_URL ?? null;
const CHECKLIST_CTA_URL =
  process.env.NEXT_PUBLIC_CHECKLIST_CTA_URL ?? "https://app.maphpro3d.com/";
const APP_BASE_URL = APP_URL.replace(/\/$/, "");
const APP_LOGIN_URL = `${APP_BASE_URL}/login`;
const APP_SIGNUP_URL = `${APP_BASE_URL}/login?signup=1`;
const LEAD_MAGNET_URL = "/checklist-precificacao-3d.txt";

export default function Home() {
  const faqItems = [
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
  ];

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
                className="hidden rounded-full border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 md:inline-flex"
              >
                Entrar
              </Link>
              <Link
                href={APP_SIGNUP_URL}
                className="hidden rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-emerald-400 md:inline-flex"
              >
                Teste grátis
              </Link>
              <MobileNav
                appLoginUrl={APP_LOGIN_URL}
                appSignupUrl={APP_SIGNUP_URL}
                docsUrl={DOCS_URL}
              />
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
            <div className="w-full sm:w-auto">
              <a
                href={LEAD_MAGNET_URL}
                download="checklist-precificacao-3d.txt"
                className="block w-full rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-8 py-4 text-center text-base font-medium text-cyan-200 transition hover:bg-cyan-500/15 sm:w-auto"
              >
                Baixar checklist grátis
              </a>
              <a
                href={CHECKLIST_CTA_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block text-center text-xs font-medium text-slate-300 hover:text-cyan-300"
              >
                Quer aplicar em 5 minutos? Crie sua conta grátis →
              </a>
            </div>
            <a
              href="#recursos"
              className="w-full rounded-xl border border-slate-600 bg-slate-800/50 px-8 py-4 text-center text-base font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800/80 sm:w-auto"
            >
              Ver recursos
            </a>
          </div>

          {/* Stats (animado) */}
          <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: 8, suf: "+", label: "custos calculados por peça" },
              { n: 3, suf: " canais", label: "Shopee, ML e venda direta" },
              { n: 5, suf: "min", label: "da simulação ao preço final" },
              { n: 100, suf: "%", label: "online — use no celular ou PC" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 text-left"
              >
                <p className="text-2xl font-extrabold tracking-tight text-slate-50">
                  <CountUp to={s.n} suffix={s.suf} />
                </p>
                <p className="mt-1 text-sm text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ========== MOCKUP DO PRODUTO ========== */}
        <div className="border-t border-slate-800/40 pb-4">
          <ProductMockup />
        </div>

        {/* ========== PROVA SOCIAL ========== */}
        <section className="border-t border-slate-800/80 bg-slate-900/20 py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <p className="mb-8 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Quem usa o Maph Pro 3D
            </p>
            <div className="grid gap-5 sm:grid-cols-3">
              {[
                {
                  quote:
                    "Antes eu chutava o preço e ficava no zero a zero. Agora em 5 minutos tenho o preço mínimo, o ideal e a margem de cada canal. Nunca mais vendi no prejuízo sem perceber.",
                  name: "Rafael M.",
                  role: "Impressão 3D para e-commerce · Shopee",
                  initial: "R",
                },
                {
                  quote:
                    "Organizei os insumos, as ordens e os preços em um lugar só. O PDF de orçamento com minha logo profissionalizou muito o atendimento — clientes param de pechinchar quando veem o documento.",
                  name: "Camila S.",
                  role: "Lab 3D — cosplay e miniaturas · Venda direta",
                  initial: "C",
                },
                {
                  quote:
                    "A calculadora com taxa de falha foi o que fez diferença pra mim. Eu não colocava esse custo no preço e perdia dinheiro em peças longas. Agora está tudo no cálculo.",
                  name: "Douglas F.",
                  role: "Peças técnicas e protótipos · Mercado Livre",
                  initial: "D",
                },
              ].map((t) => (
                <div
                  key={t.name}
                  className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950/70 p-6"
                >
                  <p className="flex-1 text-sm leading-relaxed text-slate-300">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 text-sm font-bold text-slate-950">
                      {t.initial}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{t.name}</p>
                      <p className="text-[11px] text-slate-500">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== OFERTA — ANTES / DEPOIS ========== */}
        <section id="oferta" className="border-t border-slate-800/80 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-slate-50 sm:text-4xl">
                Do achismo ao preço com método
              </h2>
              <p className="mt-4 text-slate-400">
                Uma ferramenta construída para quem já perdeu dinheiro precificando na intuição.
              </p>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {/* Antes */}
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-rose-400">
                  Sem o Maph Pro 3D
                </p>
                <ul className="space-y-3">
                  {[
                    "Preço calculado na base do feeling — sem saber o custo real",
                    "Taxa de falha ignorada: peça quebra no fim e você absorve o prejuízo",
                    "Comissão do marketplace não entra no cálculo até a fatura chegar",
                    "Depreciação da impressora nunca calculada",
                    "Cada orçamento feito do zero, sem padrão",
                    "Não sabe se o mês fechou com lucro ou prejuízo",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-400">
                      <span className="mt-0.5 shrink-0 text-rose-400">✕</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Depois */}
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-6">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                  Com o Maph Pro 3D
                </p>
                <ul className="space-y-3">
                  {[
                    "Custo real por peça: filamento, energia, embalagem e depreciação",
                    "Taxa de falha embutida no preço — margem protegida mesmo quando falha",
                    "Taxas Shopee, ML e cartão calculadas antes de anunciar",
                    "Preço mínimo e sugerido por canal em menos de 5 minutos",
                    "Orçamento em PDF com sua marca gerado em segundos",
                    "Dashboard com lucro bruto, líquido e desempenho por período",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <span className="mt-0.5 shrink-0 text-emerald-400">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
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

            <div className="mt-10">
              <FeatureTabs
                tabs={[
                  {
                    id: "precificacao",
                    label: "Precificação",
                    title: "Preço sugerido e mínimo antes de anunciar",
                    description:
                      "Você vê custo real, taxas por canal, impostos e lucro líquido. Assim evita vender abaixo do custo sem perceber.",
                    bullets: [
                      "Custo real por peça (não só filamento)",
                      "Energia, embalagem e depreciação",
                      "Taxa de falha e cenários avançados",
                      "Shopee, Mercado Livre, PIX e cartão",
                    ],
                  },
                  {
                    id: "operacao",
                    label: "Operação",
                    title: "Produção e estoque conectados ao custo",
                    description:
                      "Organize impressoras, ordens e insumos para precificar com base na sua realidade, não em achismo.",
                    bullets: [
                      "Ordens ligadas a produtos e impressoras",
                      "Insumos com histórico de movimentações",
                      "Peças produzidas e acompanhamento",
                      "Dashboard operacional por período",
                    ],
                  },
                  {
                    id: "comercial",
                    label: "Comercial",
                    title: "Venda com documento e números claros",
                    description:
                      "Registre vendas por canal e gere orçamento em PDF com sua marca para profissionalizar o atendimento.",
                    bullets: [
                      "Vendas por canal e receita no painel",
                      "Orçamentos em PDF com logo e dados",
                      "Relatórios para decisão",
                      "Alertas sobre operação e margem",
                    ],
                  },
                ]}
              />
            </div>

          </div>
        </section>

        {/* ========== QUIZ (posição correta: após Recursos) ========== */}
        <section id="quiz" className="border-t border-slate-800/80 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <PricingQuiz
              ctaHref={APP_SIGNUP_URL}
              sections={[
                {
                  title: "Sessão: Você está precificando no achismo?",
                  questions: [
                    { id: "q1", text: "1. Você sabe exatamente quanto custa o filamento que vai em cada peça ou chuta um valor "por média"?" },
                    { id: "q2", text: "2. Quando você liga a impressora, sabe quantos centavos de energia está gastando por hora de impressão?" },
                    { id: "q3", text: "3. Já parou para somar o custo de fita, cola, pincel e embalagem que "não custa quase nada" — mas no fim do mês dá R$ 200+?" },
                    { id: "q4", text: "4. Sua impressora de R$ 3.000 já pagou metade do valor dela só com impressões vendidas, ou você nunca calculou a depreciação?" },
                    { id: "q5", text: "5. Quando uma impressão falha no 90%, você repassa esse custo pro cliente ou come do seu lucro?" },
                  ],
                },
                {
                  title: "Sessão: Você está vendendo com prejuízo sem perceber?",
                  questions: [
                    { id: "q6", text: "6. Antes de bater o martelo no preço, você define qual margem mínima precisa ter — ou aceita "o que o cliente pagar"?" },
                    { id: "q7", text: "7. Já fez a conta real: Shopee cobra 20%, frete grátis come 15%, imposto pega mais 10% — quanto sobra pra você no final?" },
                    { id: "q8", text: "8. Quando vê um concorrente vendendo mais barato, você tem certeza que ele está lucrando ou apenas queimando estoque?" },
                    { id: "q9", text: "9. Você tem um "preço de piso" anotado onde realmente não vale a pena vender, ou topa qualquer oferta?" },
                    { id: "q10", text: "10. No fim do mês, depois de pagar tudo, sobra quanto % de lucro líquido — 30%, 10%, ou está no vermelho?" },
                  ],
                },
                {
                  title: "Sessão: Sua operação está escalável?",
                  questions: [
                    { id: "q11", text: "11. Quanto do seu tempo (por minuto) está embutido no preço da peça — ou você trabalha de graça sem contabilizar?" },
                    { id: "q12", text: "12. Se chegasse 50 pedidos iguais amanhã, você conseguiria replicar esse preço rapidamente ou teria que calcular tudo de novo do zero?" },
                  ],
                },
              ]}
            />
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
              {/* Free */}
              <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950/80 p-6 text-center">
                <p className="text-sm font-semibold text-slate-400">Free</p>
                <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-50">R$ 0</p>
                <p className="mt-2 text-sm text-slate-500">Inclui trial com acesso Pro.</p>
                <Link
                  href={APP_SIGNUP_URL}
                  className="mt-6 block rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-900"
                >
                  Começar grátis
                </Link>
              </div>
              {/* Pro */}
              <div className="flex flex-col rounded-2xl border border-cyan-500/40 bg-slate-900/80 p-6 text-center shadow-lg shadow-cyan-500/10">
                <p className="text-sm font-semibold text-cyan-400">Pro mensal</p>
                <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-50">R$ 29,90</p>
                <p className="mt-1 text-sm text-slate-500">/mês</p>
                <p className="mt-2 text-sm text-slate-400">Precificação e operação completas.</p>
                <Link
                  href={`${APP_BASE_URL}/pricing`}
                  className="mt-6 block rounded-xl border border-cyan-500/50 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/15"
                >
                  Assinar mensal
                </Link>
              </div>
              {/* Business / Anual — destaque */}
              <div className="relative flex flex-col overflow-hidden rounded-2xl border-2 border-emerald-500/50 bg-slate-900/80 p-6 text-center shadow-[0_0_48px_-18px_rgba(52,211,153,0.4)]">
                <span className="absolute right-3 top-3 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-200">
                  Melhor custo
                </span>
                <p className="text-sm font-semibold text-emerald-400">Business anual</p>
                <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-50">R$ 199,90</p>
                <p className="mt-1 text-sm text-slate-500">/ano · ~R$ 16,66/mês</p>
                <p className="mt-2 text-sm text-emerald-400/90">Economia de 44% vs. mensal.</p>
                <Link
                  href={`${APP_BASE_URL}/pricing`}
                  className="mt-6 block rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:from-emerald-400 hover:to-teal-400"
                >
                  Assinar anual
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ========== LEAD MAGNET ========== */}
        <section className="border-t border-slate-800/80 py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-500/10 to-slate-950/50 p-6 sm:p-8">
              <h3 className="text-2xl font-bold text-slate-50">
                Checklist grátis: 12 erros que reduzem seu lucro na impressão 3D
              </h3>
              <p className="mt-3 text-sm text-slate-300">
                Material rápido para aplicar hoje e já corrigir precificação, taxa e margem.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <div className="w-full sm:w-auto">
                  <a
                    href={LEAD_MAGNET_URL}
                    download="checklist-precificacao-3d.txt"
                    className="inline-block w-full rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3 text-center text-sm font-semibold text-slate-950 transition hover:from-cyan-400 hover:to-emerald-400"
                  >
                    Baixar checklist grátis
                  </a>
                  <a
                    href={CHECKLIST_CTA_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block text-center text-xs font-medium text-slate-400 hover:text-cyan-300"
                  >
                    Quer aplicar em 5 minutos? Crie sua conta grátis →
                  </a>
                </div>
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

        {/* ========== QUALIFICAÇÃO (BANT) ========== */}
        <section id="qualificacao" className="border-t border-slate-800/80 bg-slate-900/30 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-bold text-slate-50 sm:text-3xl">
                Diagnóstico rápido (BANT): o Maph Pro 3D é para você agora?
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                BANT = Orçamento, Autoridade de decisão, Necessidade e Tempo.
              </p>
              <p className="mt-3 text-slate-400">
                Se você marcar “sim” para 3 ou mais pontos, vale iniciar o teste grátis hoje.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <BantCard
                title="B · Orçamento"
                question="Você já vende ou quer vender peças com ticket acima de R$ 30?"
              />
              <BantCard
                title="A · Autoridade de decisão"
                question="Você decide preço, desconto e canal de venda no seu negócio?"
              />
              <BantCard
                title="N · Necessidade"
                question="Você já teve dúvida se estava lucrando de verdade em cada venda?"
              />
              <BantCard
                title="T · Tempo"
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
            <FaqAccordion items={faqItems} />
          </div>
        </section>

        {/* ========== CTA FINAL ========== */}
        <section className="border-t border-slate-800/80 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
              Sem cartão de crédito · Cancele quando quiser
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
              Pare de perder dinheiro em cada venda.
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              Configure em 5 minutos, siga o tutorial no app e faça sua primeira simulação com seus custos reais — ainda hoje.
            </p>
            <Link
              href={APP_SIGNUP_URL}
              className="mt-8 inline-block rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-10 py-4 text-base font-semibold text-slate-950 shadow-xl shadow-cyan-500/25 transition hover:from-cyan-400 hover:to-emerald-400"
            >
              Começar grátis agora
            </Link>
            <p className="mt-4 text-sm text-slate-500">
              Trial com acesso completo · sem compromisso
            </p>
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
            <div className="mt-12 border-t border-slate-800 pt-8 flex flex-col items-center justify-between gap-3 text-xs text-slate-500 sm:flex-row">
              <p>© {new Date().getFullYear()} Maph Pro 3D. Todos os direitos reservados.</p>
              <div className="flex gap-4">
                <Link
                  href={`${APP_BASE_URL}/termos`}
                  className="hover:text-slate-400"
                >
                  Termos de uso
                </Link>
                <Link
                  href={`${APP_BASE_URL}/privacidade`}
                  className="hover:text-slate-400"
                >
                  Política de privacidade
                </Link>
              </div>
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
