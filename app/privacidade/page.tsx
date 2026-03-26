import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade — Maph Pro 3D",
};

const LAST_UPDATED = "26 de março de 2026";

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15">
          <ShieldCheck className="h-6 w-6 text-emerald-400" aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
            Política de Privacidade
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Última atualização: {LAST_UPDATED}
          </p>
        </div>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-slate-300">
        <Section title="1. Controlador dos dados">
          <p>
            Esta Política descreve como o <strong className="text-slate-100">Maph Pro 3D</strong>{" "}
            ("nós", "nosso") coleta, usa e protege seus dados pessoais, em conformidade com a Lei
            Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018).
          </p>
          <p className="mt-2">
            Para exercer seus direitos ou tirar dúvidas, entre em contato pelo nosso{" "}
            <Link href="/suporte" className="text-cyan-400 underline-offset-2 hover:underline">
              canal de suporte
            </Link>
            .
          </p>
        </Section>

        <Section title="2. Dados coletados">
          <p className="mb-2">Coletamos os seguintes dados:</p>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-700 text-left text-slate-400">
                <th className="pb-2 pr-4 font-medium">Dado</th>
                <th className="pb-2 pr-4 font-medium">Finalidade</th>
                <th className="pb-2 font-medium">Base legal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {[
                ["E-mail", "Autenticação e comunicações do serviço", "Execução de contrato"],
                ["Dados de uso do app", "Melhoria do produto e relatórios do usuário", "Legítimo interesse"],
                ["CPF/CNPJ (opcional)", "Processamento de pagamento via AbacatePay", "Execução de contrato"],
                ["Nome e telefone (opcional)", "Identificação no checkout AbacatePay", "Execução de contrato"],
                ["Endereço IP e logs", "Segurança, prevenção a fraudes e diagnóstico", "Legítimo interesse"],
              ].map(([dado, fin, base]) => (
                <tr key={dado} className="text-slate-300">
                  <td className="py-2 pr-4 font-medium text-slate-200">{dado}</td>
                  <td className="py-2 pr-4">{fin}</td>
                  <td className="py-2 text-slate-400">{base}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="3. Como seus dados são usados">
          <ul className="list-disc space-y-1 pl-5">
            <li>Autenticação e controle de acesso à sua conta.</li>
            <li>Processamento de pagamentos e verificação de assinatura ativa.</li>
            <li>Envio de comunicações essenciais (confirmação de conta, alertas de trial, suporte).</li>
            <li>Diagnóstico de falhas e melhoria do desempenho do Serviço.</li>
            <li>Cumprimento de obrigações legais.</li>
          </ul>
          <p className="mt-2">
            Não vendemos nem compartilhamos seus dados pessoais com terceiros para fins
            publicitários.
          </p>
        </Section>

        <Section title="4. Compartilhamento de dados">
          <p className="mb-2">
            Seus dados podem ser processados pelos seguintes fornecedores ("operadores"):
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-slate-100">Supabase</strong> — banco de dados e autenticação
              (infraestrutura hospedada na AWS).
            </li>
            <li>
              <strong className="text-slate-100">AbacatePay</strong> — processador de pagamentos
              (PIX e cartão). CPF/CNPJ e dados de pagamento são transmitidos de forma segura e
              nunca armazenados em nossos servidores.
            </li>
            <li>
              <strong className="text-slate-100">Vercel</strong> — hospedagem da aplicação web.
            </li>
            <li>
              <strong className="text-slate-100">Google Analytics</strong> — análise de uso
              anônima (opcional, desativável via configurações do navegador).
            </li>
          </ul>
        </Section>

        <Section title="5. Retenção de dados">
          <ul className="list-disc space-y-1 pl-5">
            <li>Dados de conta são mantidos enquanto a conta estiver ativa.</li>
            <li>
              Após o cancelamento ou exclusão da conta, os dados são anonimizados ou excluídos em
              até 90 dias, salvo obrigação legal de retenção.
            </li>
            <li>Logs de segurança são retidos por até 12 meses.</li>
          </ul>
        </Section>

        <Section title="6. Segurança">
          <p>
            Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo
            criptografia em trânsito (HTTPS/TLS), controle de acesso por função, autenticação via
            JWT e Row-Level Security no banco de dados. Nenhum método é 100% seguro; em caso de
            incidente, você será notificado nos termos da LGPD.
          </p>
        </Section>

        <Section title="7. Seus direitos (LGPD)">
          <p className="mb-2">Você tem direito a:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Confirmar a existência de tratamento dos seus dados.</li>
            <li>Acessar os dados que temos sobre você.</li>
            <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
            <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários.</li>
            <li>Solicitar a portabilidade dos seus dados.</li>
            <li>Revogar o consentimento a qualquer momento.</li>
            <li>Solicitar a exclusão completa da sua conta.</li>
          </ul>
          <p className="mt-2">
            Para exercer qualquer direito, entre em contato pelo nosso{" "}
            <Link href="/suporte" className="text-cyan-400 underline-offset-2 hover:underline">
              canal de suporte
            </Link>
            . Respondemos em até 15 dias úteis.
          </p>
        </Section>

        <Section title="8. Cookies">
          <p>
            Utilizamos cookies estritamente necessários para autenticação (sessão Supabase) e
            cookies de análise (Google Analytics, quando consentido). Você pode desativar cookies
            de análise nas configurações do seu navegador.
          </p>
        </Section>

        <Section title="9. Menores de idade">
          <p>
            O Serviço não é destinado a menores de 18 anos. Não coletamos intencionalmente dados
            de menores. Se identificarmos dados de menores, excluiremos imediatamente.
          </p>
        </Section>

        <Section title="10. Alterações nesta política">
          <p>
            Podemos atualizar esta Política periodicamente. Alterações relevantes serão comunicadas
            por e-mail ou banner no app. O uso continuado após a vigência implica aceitação.
          </p>
        </Section>
      </div>

      <nav className="flex flex-wrap gap-4 border-t border-slate-800 pt-6 text-xs text-slate-500">
        <Link href="/termos" className="text-cyan-300/80 underline-offset-2 hover:underline">
          Termos de Serviço
        </Link>
        <Link href="/suporte" className="text-cyan-300/80 underline-offset-2 hover:underline">
          Suporte
        </Link>
        <Link href="/" className="text-cyan-300/80 underline-offset-2 hover:underline">
          Voltar ao painel
        </Link>
      </nav>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 font-semibold text-slate-100">{title}</h2>
      {children}
    </section>
  );
}
