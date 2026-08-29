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

const MINI_CARD_CLASS = "mp3d-mini";
const STYLE_ID = "mp3d-mini-style";
const LAYER_ID = "mp3d-mini-layer";

function ensureMiniCardStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.${MINI_CARD_CLASS} {
  position: absolute;
  border-radius: 10px;
  border: 1px solid rgba(51,65,85,0.85);
  background: rgba(2,6,23,0.98);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 10.5px;
  color: #e2e8f0;
  box-shadow: 0 6px 18px rgba(0,0,0,0.35);
  overflow: hidden;
}
.${MINI_CARD_CLASS}.champion { border-color: rgba(250,204,21,0.7); box-shadow: 0 0 0 1px rgba(250,204,21,0.3) inset, 0 6px 18px rgba(0,0,0,0.35); }
.${MINI_CARD_CLASS}-actions { display: flex; gap: 3px; padding: 4px; border-bottom: 1px solid rgba(51,65,85,0.6); }
.${MINI_CARD_CLASS}-actions button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 19px;
  border-radius: 5px;
  border: 1px solid rgba(51,65,85,0.7);
  background: rgba(15,23,42,0.7);
  color: #94a3b8;
  cursor: pointer;
  font-size: 10px;
  padding: 0;
}
.${MINI_CARD_CLASS}-actions button:hover { color: #67e8f9; border-color: rgba(34,211,238,0.4); }
.${MINI_CARD_CLASS}-created {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 6px;
  border-bottom: 1px solid rgba(51,65,85,0.5);
  font-size: 9.5px;
  color: #94a3b8;
}
.${MINI_CARD_CLASS}-age { font-weight: 700; padding: 1px 5px; border-radius: 999px; font-size: 9px; }
.${MINI_CARD_CLASS}-age.new { background: rgba(52,211,153,0.15); color: #34d399; }
.${MINI_CARD_CLASS}-age.mid { background: rgba(251,191,36,0.15); color: #fbbf24; }
.${MINI_CARD_CLASS}-age.old { background: rgba(251,113,133,0.15); color: #fb7185; }
.${MINI_CARD_CLASS}-rows { padding: 1px 6px; }
.${MINI_CARD_CLASS}-row { display: flex; align-items: center; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid rgba(51,65,85,0.3); }
.${MINI_CARD_CLASS}-row:last-child { border-bottom: none; }
.${MINI_CARD_CLASS}-row-label { display: flex; align-items: center; gap: 4px; color: #94a3b8; }
.${MINI_CARD_CLASS}-row-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 4px;
  background: rgba(99,102,241,0.15);
  font-size: 8px;
  flex-shrink: 0;
}
.${MINI_CARD_CLASS}-row-value { font-weight: 700; color: #f1f5f9; }
.${MINI_CARD_CLASS}-row-value.money { color: #34d399; }
.${MINI_CARD_CLASS}-row-value.champ { color: #facc15; }
.${MINI_CARD_CLASS}-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  border-top: 1px solid rgba(51,65,85,0.6);
  font-size: 9px;
  color: #94a3b8;
}
.${MINI_CARD_CLASS}-footer b { color: #cbd5e1; font-weight: 600; }
.${MINI_CARD_CLASS}-toggle {
  position: absolute;
  top: -9px;
  right: 6px;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 1px solid rgba(51,65,85,0.9);
  background: #0f172a;
  color: #94a3b8;
  font-size: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
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

function row(label: string, icon: string, value: string, cls?: string): HTMLDivElement {
  const el = document.createElement("div");
  el.className = `${MINI_CARD_CLASS}-row`;
  el.innerHTML = `
    <span class="${MINI_CARD_CLASS}-row-label"><span class="${MINI_CARD_CLASS}-row-icon">${icon}</span>${label}</span>
    <span class="${MINI_CARD_CLASS}-row-value${cls ? " " + cls : ""}">${value}</span>
  `;
  return el;
}

function makerWorldUrl(title: string | null) {
  const q = (title ?? "").split(/[-–|]/)[0].trim();
  return `https://makerworld.com/en/search/models?keyword=${encodeURIComponent(q)}`;
}

function summaryText(card: EnrichedCard): string {
  const lines = [
    card.name ?? "(sem título)",
    card.price != null ? `Preço: ${fmtBRL(card.price)}` : null,
    card.sold != null ? `Vendidos: ${card.sold}` : null,
    card.salesPerDay != null ? `Vendas/dia: ${card.salesPerDay.toFixed(1)} (est.)` : null,
    card.rating != null ? `Nota: ${card.rating}` : null,
    card.reviewCount != null ? `Avaliações: ${card.reviewCount}` : null,
    card.liked != null ? `Favoritos: ${card.liked}` : null,
    card.createdDaysAgo != null ? `Criado há: ${card.createdDaysAgo} dias` : null,
    card.sellerName ? `Vendedor: ${card.sellerName}${card.sellerLocation ? ` · ${card.sellerLocation}` : ""}` : null,
  ];
  return lines.filter(Boolean).join("\n");
}

function buildMiniCard(card: EnrichedCard, isChampion: boolean): HTMLElement {
  const mini = document.createElement("div");
  mini.className = MINI_CARD_CLASS + (isChampion ? " champion" : "");

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
  mini.appendChild(toggle);

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
    window.open(makerWorldUrl(card.name), "_blank", "noreferrer");
  };

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.title = "Copiar dados deste anúncio";
  copyBtn.textContent = "📋";
  copyBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(summaryText(card)).then(() => {
      const original = copyBtn.textContent;
      copyBtn.textContent = "✓";
      setTimeout(() => (copyBtn.textContent = original), 1200);
    });
  };

  actions.append(downloadBtn, makerWorldBtn, copyBtn);
  body.appendChild(actions);

  const created = document.createElement("div");
  created.className = `${MINI_CARD_CLASS}-created`;
  const bucket = ageBucketClass(card.createdDaysAgo);
  created.innerHTML = `
    <span>📅 ${card.createdAt ? card.createdAt.toLocaleDateString("pt-BR") : "data desconhecida"}</span>
    <span class="${MINI_CARD_CLASS}-age ${bucket}">${card.createdDaysAgo != null ? `${card.createdDaysAgo}d` : "?"}</span>
  `;
  body.appendChild(created);

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
    rows.appendChild(row("Faturamento total", "💰", fmtBRL(card.price * card.sold), "money"));
  }
  if (card.price != null && card.salesPerDay != null) {
    rows.appendChild(row("Faturamento/mês", "🏦", fmtBRL(card.price * card.salesPerDay * 30), "money"));
  }
  body.appendChild(rows);

  if (card.sellerName) {
    const footer = document.createElement("div");
    footer.className = `${MINI_CARD_CLASS}-footer`;
    footer.innerHTML = `<b>${card.sellerName}</b><span>${card.sellerLocation ?? ""}${card.isInternational ? " · internacional" : ""}</span>`;
    body.appendChild(footer);
  }

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

/** Cria (ou atualiza) o mini-card de `card` na camada de overlay e reposiciona sobre o card real. */
export function upsertMiniCard(card: EnrichedCard, isChampion: boolean) {
  if (!card.el) return;
  ensureMiniCardStyles();

  let mini = registry.get(card.el);
  if (!mini) {
    mini = buildMiniCard(card, isChampion);
    registry.set(card.el, mini);
    getLayer().appendChild(mini);
  } else {
    const rebuilt = buildMiniCard(card, isChampion);
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
