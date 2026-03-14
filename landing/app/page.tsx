import Link from "next/link";
import Image from "next/image";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://maphpro3d-app.vercel.app";
const DOCS_URL =
  process.env.NEXT_PUBLIC_DOCS_URL ?? null;

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
              <a href="#recursos" className="text-sm text-slate-400 hover:text-cyan-400">
                Recursos
              </a>
              <a href="#precos" className="text-sm text-slate-400 hover:text-cyan-400">
                Preços
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
                  Documentação
                </a>
              )}
            </nav>
            <div className="flex items-center gap-3">
              <Link
                href={APP_URL}
                className="rounded-full border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
              >
                Entrar
              </Link>
              <Link
                href={APP_URL}
                className="rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-emerald-400"
              >
                Começar agora
              </Link>
            </div>
          </div>
        </header>

        {/* ========== HERO ========== */}
        <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
            Precificação e gestão para makers
          </p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-50 sm:text-5xl lg:text-6xl">
            Precifique certo.{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Venda com margem.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
            Calculadora de custos e preços para impressão 3D. Shopee, Mercado
            Livre e venda direta (PIX e cartão) em poucas linhas.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={APP_URL}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-8 py-4 text-center text-base font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 transition hover:from-cyan-400 hover:to-emerald-400 sm:w-auto"
            >
              Começar agora
            </Link>
            <a
              href="#recursos"
              className="w-full rounded-xl border border-slate-600 bg-slate-800/50 px-8 py-4 text-center text-base font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800/80 sm:w-auto"
            >
              Por que usar?
            </a>
          </div>
        </section>

        {/* ========== CANAIS DE VENDA (estilo AbacatePay) ========== */}
        <section id="recursos" className="border-t border-slate-800/80 bg-slate-900/30 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: "Calculadora completa",
                  description:
                    "Custo por peça, energia, filamento, depreciação e embalagem. Sugestão de preço por canal com margem desejada.",
                  icon: "🧮",
                },
                {
                  title: "Shopee e Mercado Livre",
                  description:
                    "Taxas e comissões configuráveis. Frete grátis, CPF ou CNPJ. Preço mínimo e sugestões por marketplace.",
                  icon: "🛒",
                },
                {
                  title: "PIX e cartão direto",
                  description:
                    "Preços sugeridos para venda direta sem marketplace. Taxa de cartão configurável. Ideal para encomendas.",
                  icon: "💳",
                },
                {
                  title: "Produtos e estoque",
                  description:
                    "Salve simulações como produtos, acompanhe estoque e organize seu catálogo para venda.",
                  icon: "📦",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 backdrop-blur-sm transition hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5"
                >
                  <span className="text-3xl" aria-hidden>
                    {item.icon}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-slate-100">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== QUANTO CUSTA ========== */}
        <section id="precos" className="border-t border-slate-800/80 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-50 sm:text-4xl">
              Quanto custa?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
              Menos do que você imagina. Em beta, acesso gratuito para testar
              todas as funções. Planos em breve.
            </p>
            <Link
              href={APP_URL}
              className="mt-8 inline-block rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-8 py-3.5 text-base font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-emerald-400"
            >
              Ver o app
            </Link>
          </div>
        </section>

        {/* ========== INTEGRAÇÕES ========== */}
        <section className="border-t border-slate-800/80 bg-slate-900/30 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-2xl font-bold text-slate-50 sm:text-3xl">
              Use onde quiser
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-400">
              Navegador, celular ou instalado como app. PWA com suporte offline
              básico.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-8 text-slate-500">
              <span className="rounded-xl border border-slate-700 bg-slate-800/50 px-5 py-2.5 text-sm font-medium">
                PWA
              </span>
              <span className="rounded-xl border border-slate-700 bg-slate-800/50 px-5 py-2.5 text-sm font-medium">
                Navegador
              </span>
              <span className="rounded-xl border border-slate-700 bg-slate-800/50 px-5 py-2.5 text-sm font-medium">
                Mobile
              </span>
              <span className="rounded-xl border border-slate-700 bg-slate-800/50 px-5 py-2.5 text-sm font-medium">
                Desktop
              </span>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {DOCS_URL ? (
                <Link
                  href={DOCS_URL}
                  className="group rounded-2xl border border-slate-800 bg-slate-950/80 p-6 transition hover:border-cyan-500/40"
                >
                  <h3 className="text-lg font-semibold text-slate-100 group-hover:text-cyan-400">
                    Documentação
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Guias e referência para usar o Maph Pro 3D no dia a dia.
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
                    Documentação
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Guias e referência em breve. Enquanto isso, use o app.
                  </p>
                  <span className="mt-3 inline-block text-sm font-medium text-cyan-400">
                    Ver seção documentação →
                  </span>
                </a>
              )}
              <Link
                href={APP_URL}
                className="group rounded-2xl border border-slate-800 bg-slate-950/80 p-6 transition hover:border-cyan-500/40"
              >
                <h3 className="text-lg font-semibold text-slate-100 group-hover:text-cyan-400">
                  Calculadora
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Abra o app e comece a simular custos e preços agora.
                </p>
                <span className="mt-3 inline-block text-sm font-medium text-cyan-400">
                  Abrir o app →
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* ========== DOCUMENTAÇÃO ========== */}
        <section id="docs" className="border-t border-slate-800/80 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-50 sm:text-3xl">
              Documentação
            </h2>
            <p className="mt-4 text-slate-400">
              Guias e tutoriais em breve. Enquanto isso, use o app para explorar
              a calculadora, configurações e gestão de produtos.
            </p>
            <Link
              href={APP_URL}
              className="mt-6 inline-block rounded-xl border border-slate-600 bg-slate-800/50 px-6 py-3 text-sm font-medium text-slate-200 transition hover:border-cyan-500/50 hover:bg-slate-800"
            >
              Abrir o app
            </Link>
          </div>
        </section>

        {/* ========== SUITE DE SOLUÇÕES ========== */}
        <section className="border-t border-slate-800/80 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-2xl font-bold text-slate-50 sm:text-3xl">
              Uma solução completa para o seu negócio 3D
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-400">
              Precificação, marketplaces e gestão de produtos em um só lugar.
            </p>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {[
                {
                  title: "Precificação inteligente",
                  description:
                    "Calcule custos reais por peça e sugestões de preço por canal (Shopee, ML, PIX, cartão) com a margem que você definir.",
                },
                {
                  title: "Marketplaces",
                  description:
                    "Taxas e comissões configuráveis para Shopee e Mercado Livre. Preço mínimo e kit por placa.",
                },
                {
                  title: "Gestão de produtos",
                  description:
                    "Salve simulações, acompanhe estoque, relatórios e analisador STL para estimar tempo e material.",
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

        {/* ========== FAQ ========== */}
        <section id="faq" className="border-t border-slate-800/80 bg-slate-900/30 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-2xl font-bold text-slate-50 sm:text-3xl">
              Tem dúvidas? Aqui estão as respostas.
            </h2>
            <ul className="mt-12 space-y-6">
              {[
                {
                  q: "O que é o Maph Pro 3D?",
                  a: "É um SaaS de precificação e gestão para quem imprime em 3D. Você informa peso, tempo, custos e margem desejada e recebe sugestões de preço para Shopee, Mercado Livre e venda direta (PIX e cartão), além de gestão de produtos e estoque.",
                },
                {
                  q: "Preciso pagar para usar?",
                  a: "Em versão beta, o acesso é gratuito. Quando saírem os planos, haverá opção gratuita limitada e planos pagos com mais recursos.",
                },
                {
                  q: "Funciona no celular?",
                  a: "Sim. O app é um PWA: você pode usar no navegador ou instalar na tela inicial e usar como app, inclusive com rotação de tela.",
                },
                {
                  q: "Posso usar com pessoa física (CPF)?",
                  a: "Sim. A calculadora permite escolher CPF ou CNPJ para ajustar as taxas de Shopee e Mercado Livre. Para venda direta (PIX/cartão), não há restrição.",
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
              Você chegou no fim da página.
            </h2>
            <p className="mt-3 text-slate-400">
              Se chegou até aqui, é porque tá interessado. Então vai lá, abre o
              app e começa a precificar.
            </p>
            <Link
              href={APP_URL}
              className="mt-6 inline-block rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-8 py-4 text-base font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 transition hover:from-cyan-400 hover:to-emerald-400"
            >
              Vai, clica nesse botão
            </Link>
          </div>
        </section>

        {/* ========== FOOTER (estilo AbacatePay) ========== */}
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
                      href={APP_URL}
                      className="text-sm text-slate-400 hover:text-cyan-400"
                    >
                      Entrar
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={APP_URL}
                      className="text-sm text-slate-400 hover:text-cyan-400"
                    >
                      Começar agora
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
                    {DOCS_URL ? (
                      <Link
                        href={DOCS_URL}
                        className="text-sm text-slate-400 hover:text-cyan-400"
                      >
                        Documentação
                      </Link>
                    ) : (
                      <a href="#docs" className="text-sm text-slate-400 hover:text-cyan-400">
                        Documentação
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
                      href={APP_URL}
                      className="text-sm text-slate-400 hover:text-cyan-400"
                    >
                      App
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Maph Pro 3D
                </h4>
                <p className="mt-3 text-sm text-slate-400">
                  Precificação e gestão para impressão 3D. Beta.
                </p>
              </div>
            </div>
            <div className="mt-12 border-t border-slate-800 pt-8 text-center text-sm text-slate-500">
              © {new Date().getFullYear()} Maph Pro 3D · Beta
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
