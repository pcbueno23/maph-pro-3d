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
  {
    id: "shopee-planilha-precos",
    name: "Planilha Shopee de preços",
    subtitle: "Preço, cupom e margem no layout do SaaS",
    description:
      "Gera a planilha de preços da loja Shopee (preço de cadastro, oferta relâmpago, cupom, preço final e margem) exatamente no layout fixo que este SaaS importa — mesmas abas, mesmos cabeçalhos, mesma ordem de colunas — pra você só subir o arquivo na tela de importação sem precisar ajustar nada.",
    zipFileName: "shopee-planilha-precos.zip",
    install: [],
    usage: [
      "Precisa do Claude com acesso ao navegador (extensão \"Claude in Chrome\") logado na Central do Vendedor, pra ler preços, ofertas e cupons ativos de cada anúncio. Se você já tem uma planilha anterior como modelo, pode anexar ela no chat em vez de deixar o Claude navegar do zero.",
      "Peça em português normal, por exemplo: \"gera a planilha de preços da Shopee pra importar no SaaS\". O Claude coleta os anúncios, calcula e manda o .xlsx pronto pra importar.",
      "No final ele avisa se alguma variação está violando as regras da Shopee (oferta acima de 48% ou proporção entre variações acima de 3,9x) sem mudar o layout da planilha.",
    ],
  },
  {
    id: "shopee-ads-raio-x",
    name: "Raio-X do Shopee Ads",
    subtitle: "ROAS real por produto, não o do painel",
    description:
      "Cruza cada campanha do Shopee Ads com as vendas totais reais do produto (não só as atribuídas pelo Ads) e classifica em Escalar, Manter, Ajustar ou Pausar, com o número exato de orçamento sugerido pra cada campanha.",
    zipFileName: "shopee-ads-raio-x.zip",
    install: [],
    usage: [
      "Precisa do Claude com acesso ao navegador (extensão \"Claude in Chrome\") logado na Central do Vendedor — ela lê as campanhas do Shopee Ads e as vendas de Informações Gerenciais.",
      "Peça em português normal, por exemplo: \"faz um raio-x das minhas campanhas de Ads dos últimos 30 dias\". Ela pode perguntar o ROAS mínimo que você aceita antes de classificar.",
      "Ela nunca altera orçamento sozinha — só aplica mudanças se você confirmar a lista campanha por campanha.",
    ],
  },
  {
    id: "shopee-padronizar-skus",
    name: "Padronizar SKUs Shopee",
    subtitle: "Códigos legíveis em vez de números soltos",
    description:
      "Revisa os SKUs dos seus anúncios e variações na Shopee e propõe um padrão legível (ex.: FAM2-DB-12-3F — produto, cor, tamanho, variante) em vez de código numérico, com tabela de conflitos e dicionário de abreviações da loja.",
    zipFileName: "shopee-padronizar-skus.zip",
    install: [],
    usage: [
      "Precisa do Claude com acesso ao navegador (extensão \"Claude in Chrome\") logado na Central do Vendedor pra ler os SKUs atuais de cada anúncio e variação.",
      "Peça em português normal, por exemplo: \"padroniza os SKUs dos meus anúncios da Shopee\". Ela propõe a tabela (atual → novo) antes de mexer em qualquer coisa.",
      "Ela avisa que trocar o SKU na Shopee pode quebrar vínculo com UpSeller, TikTok, Mercado Livre e o SaaS, então só aplica depois que você confirmar onde mais esse SKU é usado.",
    ],
  },
  {
    id: "shopee-para-mercado-livre",
    name: "Shopee → Mercado Livre",
    subtitle: "Copia anúncio adaptando às regras do ML",
    description:
      "Copia um anúncio (ou vários) da Shopee pro Mercado Livre — título, descrição, imagens, variações — já adaptando ao que o Mercado Livre exige (limite de caracteres, sem HTML na descrição, capa com fundo branco) e recalculando o preço pelas taxas do ML.",
    zipFileName: "shopee-para-mercado-livre.zip",
    install: [],
    usage: [
      "Precisa do Claude com acesso ao navegador (extensão \"Claude in Chrome\") logado nas duas contas (Shopee e Mercado Livre).",
      "Peça em português normal, por exemplo: \"copia os meus 5 anúncios mais vendidos da Shopee pro Mercado Livre\". Ela confere antes se o anúncio já existe lá, pra não duplicar.",
      "Publicar é mudança pública — ela sempre mostra o resumo (título, preço, capa) e só publica depois que você confirmar.",
    ],
  },
  {
    id: "shopee-para-tiktok-upseller",
    name: "Shopee → TikTok Shop (UpSeller)",
    subtitle: "Migra produtos validados sem duplicar",
    description:
      "Leva anúncios já validados na Shopee (boas vendas, pouca devolução) pro TikTok Shop usando o UpSeller, conferindo antes se o produto já existe lá pra nunca duplicar anúncio.",
    zipFileName: "shopee-para-tiktok-upseller.zip",
    install: [],
    usage: [
      "Precisa do Claude com acesso ao navegador (extensão \"Claude in Chrome\") logado na Shopee, no UpSeller (app.upseller.com) e no Seller Center do TikTok Shop.",
      "Peça em português normal, por exemplo: \"migra pro TikTok os produtos da Shopee que estão vendendo bem\". Se você já rodou a skill de ROAS real ou de Devoluções, ela reaproveita esse resultado pra priorizar o que migrar.",
      "Publicar no TikTok é mudança pública — ela sempre mostra o lote (produtos, preços, estoque) e só publica depois da sua confirmação.",
    ],
  },
  {
    id: "shopee-pesquisa-concorrentes",
    name: "Pesquisa de Concorrentes Shopee",
    subtitle: "Preço, vendas e oportunidades do nicho 3D",
    description:
      "Garimpa a Shopee por produtos impressos em 3D do seu nicho (decoração e papelaria — letreiros, organizadores, vasos modulares), compara os concorrentes mais vendidos e aponta lacunas de variação, reclamações recorrentes e faixa de preço pra oportunidades novas.",
    zipFileName: "shopee-pesquisa-concorrentes.zip",
    install: [],
    usage: [
      "Precisa do Claude com acesso ao navegador (extensão \"Claude in Chrome\") navegando em shopee.com.br — não precisa estar logado, é busca pública.",
      "Peça em português normal, por exemplo: \"pesquisa concorrentes de vasos modulares de parede na Shopee\". Sem tema definido, ela usa os três temas prioritários já combinados: letreiros/nomes personalizados, organizadores de mesa e vasos modulares.",
      "No final ela entrega um ranking dos temas por oportunidade e pode te passar pra skill de Precificação pra já testar se o preço de mercado fecha a conta com seus custos.",
    ],
  },
];

export const DEFAULTS = {
  installClaudeCode: DEFAULT_INSTALL_CLAUDE_CODE,
  installClaudeAi: DEFAULT_INSTALL_CLAUDE_AI,
  usage: DEFAULT_USAGE,
};
