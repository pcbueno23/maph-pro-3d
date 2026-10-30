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

export const AI_SKILLS: AiSkill[] = [];

export const DEFAULTS = {
  installClaudeCode: DEFAULT_INSTALL_CLAUDE_CODE,
  installClaudeAi: DEFAULT_INSTALL_CLAUDE_AI,
  usage: DEFAULT_USAGE,
};
