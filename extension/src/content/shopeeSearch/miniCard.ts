/**
 * Card de estatísticas exibido embaixo de CADA anúncio na grade de busca.
 *
 * Tentei inserir isso DENTRO do card da Shopee (empurrando a altura da linha
 * da grade pra baixo) — não funciona: a grade deles usa altura fixa por
 * linha, e a linha seguinte é desenhada por cima de qualquer conteúdo que
 * "vaze" pra baixo, deixando invisível mesmo estando certinho no HTML
 * (confirmado inspecionando ao vivo). Por isso isso aqui vive numa camada
 * separada, fora da árvore da Shopee, posicionada por coordenadas
 * (`getBoundingClientRect`) — funciona não importa o que a grade deles faça.
 *
 * DOM puro (não React) por performance: uma busca pode ter 60-90 cards.
 */
import type { EnrichedCard } from "./scrape";
import { OPEN_LOGIN_EVENT } from "../../lib/authGate";
import { getTheme, onThemeChange, type Theme } from "../../lib/theme";
import { MAPH_LOGO_DATA_URI } from "../logo";
import { showMakerWorldMenu } from "../makerWorldMenu";

const MINI_CARD_CLASS = "mp3d-mini";
const STYLE_ID = "mp3d-mini-style";
const LAYER_ID = "mp3d-mini-layer";

/** Tema atual — módulo inteiro compartilha (não dá pra passar como prop, isso aqui é DOM puro). Atualizado por `initMiniCardTheme()`, chamado uma vez pelo `shopeeSearch/index.tsx`. */
let currentTheme: Theme = "dark";

/** Busca o tema salvo e reage a mudanças (ex.: alternado no card do anúncio) — atualiza os mini-cards já na tela na hora, sem precisar recriar. Chamar uma vez ao montar o painel de busca. */
export function initMiniCardTheme(): () => void {
  getTheme().then((t) => applyThemeToAll(t));
  return onThemeChange(applyThemeToAll);
}

function applyThemeToAll(theme: Theme) {
  currentTheme = theme;
  for (const mini of registry.values()) mini.dataset.theme = theme;
}

function ensureMiniCardStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.${MINI_CARD_CLASS} {
  --mp3d-bg: rgba(2, 6, 23, 0.98);
  --mp3d-border: rgba(51, 65, 85, 0.85);
  --mp3d-border-soft: rgba(51, 65, 85, 0.5);
  --mp3d-text: #e2e8f0;
  --mp3d-text-strong: #f1f5f9;
  --mp3d-muted: #94a3b8;
  --mp3d-surface: rgba(15, 23, 42, 0.7);
  --mp3d-accent-text: #67e8f9;
  --mp3d-accent-soft-border: rgba(34, 211, 238, 0.4);
  --mp3d-on-accent: #04121a;
  --mp3d-good: #34d399;
  --mp3d-gold: #facc15;
  --mp3d-icon-bg: rgba(99, 102, 241, 0.15);
  --mp3d-shadow: rgba(0, 0, 0, 0.35);
  --mp3d-backdrop: rgba(2, 6, 23, 0.5);

  position: absolute;
  border-radius: 10px;
  border: 1px solid var(--mp3d-border);
  background: var(--mp3d-bg);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 12.5px;
  color: var(--mp3d-text);
  box-shadow: 0 6px 18px var(--mp3d-shadow);
  overflow: hidden;
}
.${MINI_CARD_CLASS}[data-theme="light"] {
  --mp3d-bg: rgba(255, 255, 255, 0.98);
  --mp3d-border: rgba(203, 213, 225, 0.9);
  --mp3d-border-soft: rgba(203, 213, 225, 0.7);
  --mp3d-text: #1e293b;
  --mp3d-text-strong: #0f172a;
  --mp3d-muted: #64748b;
  --mp3d-surface: #f1f5f9;
  --mp3d-accent-text: #0e7490;
  --mp3d-accent-soft-border: rgba(8, 145, 178, 0.35);
  --mp3d-good: #059669;
  --mp3d-gold: #b45309;
  --mp3d-icon-bg: rgba(79, 70, 229, 0.12);
  --mp3d-shadow: rgba(15, 23, 42, 0.12);
  --mp3d-backdrop: rgba(255, 255, 255, 0.75);
}
.${MINI_CARD_CLASS}.champion {
  border-width: 2.5px;
  border-color: #facc15;
  box-shadow: 0 0 0 2px rgba(250,204,21,0.45) inset, 0 0 16px rgba(250,204,21,0.35), 0 6px 18px var(--mp3d-shadow);
}
.${MINI_CARD_CLASS}-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 5px 8px;
  border-bottom: 1px solid var(--mp3d-border-soft);
}
.${MINI_CARD_CLASS}-brand { display: flex; align-items: center; gap: 5px; }
.${MINI_CARD_CLASS}-brand img { width: 13px; height: 13px; border-radius: 3px; flex-shrink: 0; }
.${MINI_CARD_CLASS}-brand span {
  font-weight: 700;
  font-size: 10px;
  color: var(--mp3d-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.${MINI_CARD_CLASS}-actions { display: flex; gap: 4px; padding: 6px; border-bottom: 1px solid var(--mp3d-border-soft); }
.${MINI_CARD_CLASS}-actions button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  border-radius: 6px;
  border: 1px solid var(--mp3d-border-soft);
  background: var(--mp3d-surface);
  color: var(--mp3d-muted);
  cursor: pointer;
  font-size: 13px;
  padding: 0;
}
.${MINI_CARD_CLASS}-actions button:hover { color: var(--mp3d-accent-text); border-color: var(--mp3d-accent-soft-border); }
.${MINI_CARD_CLASS}-created {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 10px;
  border-bottom: 1px solid var(--mp3d-border-soft);
  font-size: 11.5px;
  color: var(--mp3d-muted);
}
.${MINI_CARD_CLASS}-age { font-weight: 700; padding: 2px 7px; border-radius: 999px; font-size: 11px; }
.${MINI_CARD_CLASS}-age.new { background: rgba(52,211,153,0.15); color: #34d399; }
.${MINI_CARD_CLASS}-age.mid { background: rgba(251,191,36,0.15); color: #fbbf24; }
.${MINI_CARD_CLASS}-age.old { background: rgba(251,113,133,0.15); color: #fb7185; }
.${MINI_CARD_CLASS}-rows { padding: 3px 10px; }
.${MINI_CARD_CLASS}-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 0; border-bottom: 1px solid var(--mp3d-border-soft); }
.${MINI_CARD_CLASS}-row:last-child { border-bottom: none; }
.${MINI_CARD_CLASS}-row.stacked { flex-direction: column; align-items: flex-start; gap: 2px; }
.${MINI_CARD_CLASS}-row.stacked .${MINI_CARD_CLASS}-row-value { font-size: 15px; }
.${MINI_CARD_CLASS}-row-label { display: flex; align-items: center; gap: 6px; color: var(--mp3d-muted); }
.${MINI_CARD_CLASS}-row-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  background: var(--mp3d-icon-bg);
  font-size: 10.5px;
  flex-shrink: 0;
}
.${MINI_CARD_CLASS}-row-value { font-weight: 700; color: var(--mp3d-text-strong); font-size: 13.5px; }
.${MINI_CARD_CLASS}-row-value.money { color: var(--mp3d-good); }
.${MINI_CARD_CLASS}-row-value.champ { color: var(--mp3d-gold); }
.${MINI_CARD_CLASS}-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-top: 1px solid var(--mp3d-border-soft);
  font-size: 11px;
  color: var(--mp3d-muted);
}
.${MINI_CARD_CLASS}-footer b { color: var(--mp3d-text-strong); font-weight: 600; }
.${MINI_CARD_CLASS}-toggle {
  background: none;
  border: 1px solid var(--mp3d-border-soft);
  color: var(--mp3d-muted);
  border-radius: 6px;
  width: 20px;
  height: 20px;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.${MINI_CARD_CLASS}-toggle:hover { color: var(--mp3d-text); }
.${MINI_CARD_CLASS}-content { position: relative; }
.${MINI_CARD_CLASS}-content.locked > *:not(.${MINI_CARD_CLASS}-lock) {
  filter: blur(4px);
  user-select: none;
  pointer-events: none;
}
.${MINI_CARD_CLASS}-lock {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  text-align: center;
  padding: 6px;
  background: var(--mp3d-backdrop);
}
.${MINI_CARD_CLASS}-lock span { font-size: 11.5px; color: var(--mp3d-text); font-weight: 600; }
.${MINI_CARD_CLASS}-lock button {
  background: linear-gradient(90deg, #06b6d4, #10b981);
  color: var(--mp3d-on-accent);
  border: none;
  border-radius: 999px;
  padding: 5px 14px;
  font-weight: 700;
  font-size: 11.5px;
  cursor: pointer;
}
`;
  document.head.appendChild(style);
}

function getLayer(): HTMLElement {
  let layer = document.getElementById(LAYER_ID);
  if (!layer) {
    layer = document.createElement("div");
    layer.id = LAYER_ID;
    layer.style.cssText = "position:absolute; top:0; left:0; width:0; height:0; pointer-events:none; z-index:2147483000;";
    document.body.appendChild(layer);
  }
  return layer;
}

/** card.el -> elemento mini-card já criado (evita recriar do zero a cada render). */
const registry = new Map<HTMLElement, HTMLElement>();
/** card.el -> se está no modo compacto (colapsado pelo usuário). */
const collapsedState = new WeakMap<HTMLElement, boolean>();
/** card.el -> margin-bottom original (pra restaurar quando o mini-card some). */
const originalMargins = new WeakMap<HTMLElement, string>();
/** card.el -> display original (pra restaurar quando um filtro escondia o card). */
const originalDisplay = new WeakMap<HTMLElement, string>();
/** Todo elemento já tocado por `setCardVisible` — WeakMaps não são iteráveis, então precisamos disso à parte pra conseguir desfazer tudo de uma vez em `clearAllMiniCards`. */
const touchedCardEls = new Set<HTMLElement>();

/** Mostra/esconde o card REAL da Shopee (usado pelos filtros do painel) — sem margem reservada quando escondido. */
export function setCardVisible(cardEl: HTMLElement, visible: boolean) {
  touchedCardEls.add(cardEl);
  if (!originalDisplay.has(cardEl)) originalDisplay.set(cardEl, cardEl.style.display || "");
  if (visible) {
    cardEl.style.display = originalDisplay.get(cardEl) ?? "";
    return;
  }
  cardEl.style.display = "none";
  if (!originalMargins.has(cardEl)) originalMargins.set(cardEl, cardEl.style.marginBottom || "");
  cardEl.style.marginBottom = originalMargins.get(cardEl) ?? "";
}

/**
 * Empurra a linha seguinte da grade pra baixo, dando espaço pro mini-card
 * sem sobrepor o próximo anúncio — `margin-bottom` funciona mesmo sem
 * conseguir fazer a grade da Shopee "crescer" por dentro, porque margem é
 * espaço por fora da caixa do card, não depende do conteúdo interno dela.
 */
function applySpacing(cardEl: HTMLElement, mini: HTMLElement) {
  if (!originalMargins.has(cardEl)) {
    originalMargins.set(cardEl, cardEl.style.marginBottom || "");
  }
  const gap = 10;
  cardEl.style.marginBottom = `${mini.offsetHeight + gap}px`;
}

function ageBucketClass(days: number | null): "new" | "mid" | "old" {
  if (days == null) return "mid";
  if (days <= 90) return "new";
  if (days <= 365) return "mid";
  return "old";
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** `stacked` põe o valor numa linha própria embaixo do rótulo — usado nos valores em R$, que costumam ser compridos demais pra caber do lado do rótulo sem cortar. */
function row(label: string, icon: string, value: string, cls?: string, stacked?: boolean): HTMLDivElement {
  const el = document.createElement("div");
  el.className = `${MINI_CARD_CLASS}-row${stacked ? " stacked" : ""}`;
  el.innerHTML = `
    <span class="${MINI_CARD_CLASS}-row-label"><span class="${MINI_CARD_CLASS}-row-icon">${icon}</span>${label}</span>
    <span class="${MINI_CARD_CLASS}-row-value${cls ? " " + cls : ""}">${value}</span>
  `;
  return el;
}

function buildMiniCard(card: EnrichedCard, isChampion: boolean, locked: boolean): HTMLElement {
  const mini = document.createElement("div");
  mini.className = MINI_CARD_CLASS + (isChampion ? " champion" : "");
  mini.dataset.theme = currentTheme;

  const head = document.createElement("div");
  head.className = `${MINI_CARD_CLASS}-head`;

  const brand = document.createElement("div");
  brand.className = `${MINI_CARD_CLASS}-brand`;
  brand.innerHTML = `<img src="${MAPH_LOGO_DATA_URI}" alt="" /><span>Maph Pro 3D</span>`;
  head.appendChild(brand);

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = `${MINI_CARD_CLASS}-toggle`;
  toggle.title = "Esconder/mostrar este card";
  toggle.textContent = "–";
  toggle.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const collapsed = !collapsedState.get(card.el!);
    collapsedState.set(card.el!, collapsed);
    body.style.display = collapsed ? "none" : "";
    toggle.textContent = collapsed ? "+" : "–";
    applySpacing(card.el!, mini);
  };
  head.appendChild(toggle);
  mini.appendChild(head);

  const body = document.createElement("div");

  const actions = document.createElement("div");
  actions.className = `${MINI_CARD_CLASS}-actions`;

  const downloadBtn = document.createElement("button");
  downloadBtn.type = "button";
  downloadBtn.title = "Baixar imagem do anúncio";
  downloadBtn.textContent = "⬇";
  downloadBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!card.thumbnailUrl) return;
    const a = document.createElement("a");
    a.href = card.thumbnailUrl;
    a.download = `${card.itemId ?? "produto"}.jpg`;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.click();
  };

  const makerWorldBtn = document.createElement("button");
  makerWorldBtn.type = "button";
  makerWorldBtn.title = "Buscar modelo no MakerWorld";
  makerWorldBtn.textContent = "🧊";
  makerWorldBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    showMakerWorldMenu(makerWorldBtn, card.name, card.thumbnailUrl ?? null);
  };

  actions.append(downloadBtn, makerWorldBtn);
  body.appendChild(actions);

  const content = document.createElement("div");
  content.className = `${MINI_CARD_CLASS}-content${locked ? " locked" : ""}`;

  const created = document.createElement("div");
  created.className = `${MINI_CARD_CLASS}-created`;
  const bucket = ageBucketClass(card.createdDaysAgo);
  created.innerHTML = `
    <span>📅 ${card.createdAt ? card.createdAt.toLocaleDateString("pt-BR") : "data desconhecida"}</span>
    <span class="${MINI_CARD_CLASS}-age ${bucket}">${card.createdDaysAgo != null ? `${card.createdDaysAgo}d` : "?"}</span>
  `;
  content.appendChild(created);

  const rows = document.createElement("div");
  rows.className = `${MINI_CARD_CLASS}-rows`;
  rows.appendChild(row("Vendidos", "📦", card.sold != null ? String(card.sold) : "—"));
  rows.appendChild(
    row(
      "Vendas/dia",
      "⚡",
      card.salesPerDay != null ? `${card.salesPerDay.toFixed(1)} est.${isChampion ? " 🏆" : ""}` : "—",
      isChampion ? "champ" : undefined,
    ),
  );
  rows.appendChild(row("Nota", "⭐", card.rating != null ? `${card.rating.toFixed(1)} (${card.reviewCount ?? 0})` : "—"));
  rows.appendChild(row("Favoritos", "❤", card.liked != null ? String(card.liked) : "—"));
  if (card.price != null && card.sold != null) {
    rows.appendChild(row("Faturamento total", "💰", fmtBRL(card.price * card.sold), "money", true));
  }
  if (card.price != null && card.salesPerDay != null) {
    rows.appendChild(row("Faturamento/mês", "🏦", fmtBRL(card.price * card.salesPerDay * 30), "money", true));
  }
  content.appendChild(rows);

  if (card.sellerName) {
    const footer = document.createElement("div");
    footer.className = `${MINI_CARD_CLASS}-footer`;
    footer.innerHTML = `<b>${card.sellerName}</b><span>${card.sellerLocation ?? ""}${card.isInternational ? " · internacional" : ""}</span>`;
    content.appendChild(footer);
  }

  if (locked) {
    const lock = document.createElement("div");
    lock.className = `${MINI_CARD_CLASS}-lock`;
    const lockLabel = document.createElement("span");
    lockLabel.textContent = "🔒 Login pra ver";
    const lockBtn = document.createElement("button");
    lockBtn.type = "button";
    lockBtn.textContent = "Entrar";
    lockBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent(OPEN_LOGIN_EVENT));
    };
    lock.append(lockLabel, lockBtn);
    content.appendChild(lock);
  }

  body.appendChild(content);
  mini.appendChild(body);
  if (collapsedState.get(card.el!)) {
    body.style.display = "none";
    toggle.textContent = "+";
  }
  return mini;
}

/** Retorna false quando o mini-card ficou escondido (card sumiu/saiu do fluxo) — quem chama pula `applySpacing` nesse caso. */
function positionMiniCard(mini: HTMLElement, cardEl: HTMLElement): boolean {
  const rect = cardEl.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    // Card saiu da tela/DOM (ex.: filtro mudou) — esconde em vez de deixar em (0,0).
    mini.style.display = "none";
    return false;
  }
  mini.style.display = "";
  mini.style.top = `${rect.bottom + window.scrollY + 4}px`;
  mini.style.left = `${rect.left + window.scrollX}px`;
  mini.style.width = `${rect.width}px`;
  mini.style.pointerEvents = "auto";
  return true;
}

/** Cria (ou atualiza) o mini-card de `card` na camada de overlay e reposiciona sobre o card real. `locked` borra os dados até o usuário logar numa conta do Maph Pro 3D. */
export function upsertMiniCard(card: EnrichedCard, isChampion: boolean, locked: boolean) {
  if (!card.el) return;
  ensureMiniCardStyles();

  let mini = registry.get(card.el);
  if (!mini) {
    mini = buildMiniCard(card, isChampion, locked);
    registry.set(card.el, mini);
    getLayer().appendChild(mini);
  } else {
    const rebuilt = buildMiniCard(card, isChampion, locked);
    mini.replaceWith(rebuilt);
    registry.set(card.el, rebuilt);
    mini = rebuilt;
  }
  if (positionMiniCard(mini, card.el)) applySpacing(card.el, mini);
}

/** Remove mini-cards de anúncios que não estão mais na lista atual (ex.: filtro/ordenação mudou) — restaura a margem original do card. */
export function pruneMiniCards(activeEls: Set<HTMLElement>) {
  for (const [el, mini] of registry) {
    if (!activeEls.has(el) || !document.contains(el)) {
      mini.remove();
      registry.delete(el);
      el.style.marginBottom = originalMargins.get(el) ?? "";
      originalMargins.delete(el);
    }
  }
}

/** Reposiciona todos os mini-cards ativos — chamar em scroll/resize (a posição é em coordenadas de página, então só precisa disso se o layout mudar de tamanho, não a cada scroll). */
export function repositionAllMiniCards() {
  for (const [el, mini] of registry) {
    if (!document.contains(el)) continue;
    if (positionMiniCard(mini, el)) applySpacing(el, mini);
  }
}

/** Desfaz tudo (mini-cards, margens reservadas, cards escondidos por filtro) — chamado quando o roteador sai da página de busca via navegação SPA. */
export function clearAllMiniCards() {
  for (const [, mini] of registry) mini.remove();
  registry.clear();
  for (const el of touchedCardEls) {
    el.style.marginBottom = originalMargins.get(el) ?? "";
    el.style.display = originalDisplay.get(el) ?? "";
  }
  touchedCardEls.clear();
}
