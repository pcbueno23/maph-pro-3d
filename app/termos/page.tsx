import Link from "next/link";
import { FileText } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Serviço — Maph Pro 3D",
};

const LAST_UPDATED = "26 de março de 2026";

export default function TermosPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/15">
          <FileText className="h-6 w-6 text-cyan-400" aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
            Termos de Serviço
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Última atualização: {LAST_UPDATED}
          </p>
        </div>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-slate-300">
        <Section title="1. Aceitação dos termos">
          <p>
            Ao criar uma conta ou utilizar o <strong className="text-slate-100">Maph Pro 3D</strong>{" "}
            ("Serviço"), você concorda com estes Termos de Serviço. Se não concordar com algum item,
            não utilize o Serviço.
          </p>
        </Section>

        <Section title="2. Descrição do serviço">
          <p>
            O Maph Pro 3D é uma plataforma SaaS (Software como Serviço) voltada para empreendedores
            de impressão 3D. O Serviço oferece ferramentas de precificação, gestão de produtos,
            insumos, ordens de produção, orçamentos e relatórios financeiros acessados via
            navegador web.
          </p>
        </Section>

        <Section title="3. Cadastro e conta">
          <ul className="list-disc space-y-1 pl-5">
            <li>Você deve fornecer um endereço de e-mail válido e confirmar sua conta para utilizá-la.</li>
            <li>Você é responsável por manter a confidencialidade da sua senha.</li>
            <li>É proibido criar contas em nome de terceiros sem autorização.</li>
            <li>Cada conta é pessoal e intransferível.</li>
          </ul>
        </Section>

        <Section title="4. Planos e cobrança">
          <p className="mb-2">O Serviço é oferecido nos seguintes planos:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-slate-100">Trial gratuito:</strong> 7 dias de acesso completo
              sem necessidade de cartão de crédito, contados a partir da criação da conta.
            </li>
            <li>
              <strong className="text-slate-100">Plano Pro:</strong> assinatura mensal com acesso
              às funcionalidades completas de precificação.
            </li>
            <li>
              <strong className="text-slate-100">Plano Business:</strong> assinatura anual com
              acesso a todos os módulos do Serviço.
            </li>
          </ul>
          <p className="mt-2">
            Os pagamentos são processados pela plataforma AbacatePay. Ao assinar, você autoriza a
            cobrança recorrente conforme o plano escolhido. Os preços podem ser alterados mediante
            aviso prévio de 30 dias.
          </p>
        </Section>

        <Section title="5. Cancelamento e reembolso">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Você pode cancelar sua assinatura a qualquer momento pelo painel de cobrança. O acesso
              permanece ativo até o fim do período pago.
            </li>
            <li>
              Solicitações de reembolso são analisadas individualmente e podem ser enviadas ao
              suporte em até 7 dias corridos após a cobrança.
            </li>
            <li>Não há reembolso proporcional por períodos parcialmente utilizados.</li>
          </ul>
        </Section>

        <Section title="6. Uso aceitável">
          <p className="mb-2">É vedado:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Utilizar o Serviço para fins ilegais ou que violem direitos de terceiros.</li>
            <li>Tentar acessar áreas restritas ou realizar engenharia reversa do Serviço.</li>
            <li>Compartilhar credenciais de acesso com terceiros.</li>
            <li>Sobrecarregar intencionalmente a infraestrutura do Serviço.</li>
          </ul>
        </Section>

        <Section title="7. Propriedade intelectual">
          <p>
            Todo o conteúdo, código e design do Serviço são de propriedade do Maph Pro 3D. Os dados
            inseridos por você permanecem de sua propriedade. Você nos concede uma licença limitada
            para armazenar e exibir esses dados exclusivamente para a prestação do Serviço.
          </p>
        </Section>

        <Section title="8. Disponibilidade e limitação de responsabilidade">
          <p>
            Buscamos manter o Serviço disponível continuamente, mas não garantimos disponibilidade
            ininterrupta. Não nos responsabilizamos por perdas decorrentes de interrupções, perda de
            dados ou decisões comerciais tomadas com base nas informações geradas pelo Serviço.
          </p>
        </Section>

        <Section title="9. Privacidade">
          <p>
            O tratamento dos seus dados pessoais é descrito em nossa{" "}
            <Link href="/privacidade" className="text-cyan-400 underline-offset-2 hover:underline">
              Política de Privacidade
            </Link>
            , em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
          </p>
        </Section>

        <Section title="10. Alterações nos termos">
          <p>
            Podemos atualizar estes termos periodicamente. Alterações relevantes serão comunicadas
            por e-mail ou banner no app com antecedência mínima de 15 dias. O uso continuado após
            a vigência das alterações implica aceitação dos novos termos.
          </p>
        </Section>

        <Section title="11. Foro e legislação">
          <p>
            Estes Termos são regidos pela legislação brasileira. Fica eleito o foro da comarca do
            domicílio do prestador do serviço para dirimir quaisquer controvérsias.
          </p>
        </Section>

        <Section title="12. Contato">
          <p>
            Dúvidas sobre estes Termos podem ser enviadas pelo{" "}
            <Link href="/suporte" className="text-cyan-400 underline-offset-2 hover:underline">
              canal de suporte
            </Link>
            .
          </p>
        </Section>
      </div>

      <nav className="flex flex-wrap gap-4 border-t border-slate-800 pt-6 text-xs text-slate-500">
        <Link href="/privacidade" className="text-cyan-300/80 underline-offset-2 hover:underline">
          Política de Privacidade
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
