export type AiSkill = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  /** Nome do arquivo dentro de /public/skills/ */
  zipFileName: string;
  install: string[];
  usage: string[];
};

const DEFAULT_INSTALL_CLAUDE_CODE = [
  "Baixe o .zip clicando em \"Baixar .zip\".",
  "Extraia o .zip — vai sair uma pasta com um arquivo SKILL.md dentro.",
  "Copie essa pasta inteira para dentro de ~/.claude/skills/ (no Windows: C:\\Users\\SEU_USUARIO\\.claude\\skills\\). Se quiser que a skill valha só para um projeto específico, copie para .claude/skills/ dentro da pasta do projeto.",
  "Abra (ou reabra) o Claude Code. A skill aparece sozinha na lista de skills disponíveis.",
];

const DEFAULT_INSTALL_CLAUDE_AI = [
  "Baixe o .zip clicando em \"Baixar .zip\" (não precisa extrair).",
  "No claude.ai ou no app do Claude, vá em Configurações → Capabilities (ou \"Skills\").",
  "Clique em \"Carregar skill\" / \"Upload skill\" e selecione o arquivo .zip direto.",
  "Ative a skill — ela passa a ficar disponível em qualquer conversa nova.",
];

const DEFAULT_USAGE = [
  "Digite / seguido do nome da skill para chamar ela diretamente, ou",
  "Simplesmente peça o que você quer em português normal — se o pedido combinar com o que a skill resolve, o Claude ativa ela sozinho.",
];

export const AI_SKILLS: AiSkill[] = [
  {
    id: "shopee-roas-real",
    name: "ROAS real Shopee",
    subtitle: "Vendas reais ÷ gasto em Ads",
    description:
      "Calcula o ROAS real da sua loja Shopee (vendas pagas de Informações Gerenciais ÷ investimento em Ads do dia) dia a dia, compara com o ROAS que o próprio Shopee Ads mostra (que às vezes atribui mais venda do que a loja realmente teve) e gera um PDF com tabela e gráficos.",
    zipFileName: "shopee-roas-real.zip",
    install: [],
    usage: [
      "Precisa do Claude com acesso ao navegador (extensão \"Claude in Chrome\" ou Cowork) logado na Central do Vendedor (seller.shopee.com.br) — a skill lê os dados direto da tela, sem pedir senha.",
      "Peça em português normal, por exemplo: \"calcula o ROAS real da Shopee dos últimos 14 dias\". O Claude ativa a skill sozinho, monta o relatório e te manda o PDF.",
      "Se quiser outro período, só pedir (ex: \"dos últimos 30 dias\") — o padrão é 14 dias completos, sem contar hoje.",
    ],
  },
  {
    id: "shopee-devolucoes",
    name: "Análise de Devoluções Shopee",
    subtitle: "Reembolsos, cancelamentos e custo real",
    description:
      "Levanta todas as devoluções, reembolsos e cancelamentos da loja na Central do Vendedor, separa cancelamento sem custo de devolução efetiva, apura quanto a Shopee cobrou de frete/estorno de cada caso e gera um PDF com produtos mais devolvidos, motivos, responsabilidade logística e prejuízo real.",
    zipFileName: "shopee-devolucoes.zip",
    install: [],
    usage: [
      "Precisa do Claude com acesso ao navegador (extensão \"Claude in Chrome\") logado na Central do Vendedor (seller.shopee.com.br) — a skill lê a lista de solicitações direto da tela. Em algum momento ela pode pedir pra você digitar a senha na página \"Minha Renda\" (ela mesma não digita senha).",
      "Peça em português normal, por exemplo: \"analisa as devoluções da Shopee e me diz quanto isso custou\". O Claude ativa a skill sozinho, coleta os dados e manda o PDF.",
      "Pode levar alguns minutos — ela precisa paginar a lista de solicitações e abrir pedido por pedido pra conferir frete e estorno.",
    ],
  },
  {
    id: "shopee-precificacao",
    name: "Precificação Shopee — regras da plataforma",
    subtitle: "Oferta relâmpago, variações e kits dentro do limite",
    description:
      "Aplica as regras da Shopee que evitam bloqueio de anúncio por 'desconto enganoso': desconto máximo de 50% na oferta relâmpago (usa até 48% de margem), proporção de até 4x entre a variação mais cara e a mais barata (usa até 3,9x) e preço de campanha sempre abaixo do menor preço dos últimos 7 dias daquela variação. Usada automaticamente sempre que o Claude monta uma tabela de preço de cadastro, desconto ou faixa de variações/kits pra Shopee.",
    zipFileName: "shopee-precificacao.zip",
    install: [],
    usage: [
      "Não precisa de navegador nem de nenhum acesso especial — é só um conjunto de regras que o Claude aplica sozinho.",
      "Peça normalmente, por exemplo: \"monta a tabela de preço de cadastro e oferta relâmpago dos kits desse produto\". O Claude já calcula respeitando os três limites da Shopee.",
      "Se o produto tiver variações com preços bem diferentes entre si, o Claude avisa quando a proporção passar perto do limite de 4x e sugere um ajuste.",
    ],
  },
];

export const DEFAULTS = {
  installClaudeCode: DEFAULT_INSTALL_CLAUDE_CODE,
  installClaudeAi: DEFAULT_INSTALL_CLAUDE_AI,
  usage: DEFAULT_USAGE,
};
