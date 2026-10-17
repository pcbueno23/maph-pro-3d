/**
 * Card de estatísticas exibido embaixo de CADA anúncio da grade de produtos
 * de uma loja — dado individual daquele anúncio (vendido, vendido/mês,
 * faturamento, tempo no ar), não o resumo da loja inteira (isso já é o
 * `Panel.tsx` flutuante). Mesmo padrão de posicionamento por coordenadas de
 * shopeeSearch/miniCard.ts (ver comentário lá pro porquê de não dar pra
 * inserir dentro do card de verdade da Shopee) — DOM puro, não React.
 */
import type { ShopItem } from "./scrape";
import { OPEN_LOGIN_EVENT } from "../../lib/authGate";
import { getTheme, onThemeChange, type Theme } from "../../lib/theme";
import { MAPH_LOGO_DATA_URI } from "../logo";
import { showMakerWorldMenu } from "../makerWorldMenu";

const MINI_CARD_CLASS = "mp3d-shopmini";
const STYLE_ID = "mp3d-shopmini-style";
const LAYER_ID = "mp3d-shopmini-layer";

let currentTheme: Theme = "dark";

export function initShopMiniCardTheme(): () => void {
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
  --mp3d-icon-bg: rgba(79, 70, 229, 0.12);
  --mp3d-shadow: rgba(15, 23, 42, 0.12);
  --mp3d-backdrop: rgba(255, 255, 255, 0.75);
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
.${MINI_CARD_CLASS}-row-note { font-size: 10px; color: var(--mp3d-muted); font-weight: 500; }
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

const registry = new Map<HTMLElement, HTMLElement>();
const collapsedState = new WeakMap<HTMLElement, boolean>();
const originalMargins = new WeakMap<HTMLElement, string>();

function ageBucketClass(days: number | null): "new" | "mid" | "old" {
  if (days == null) return "mid";
  if (days <= 90) return "new";
  if (days <= 365) return "mid";
  return "old";
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function row(label: string, icon: string, value: string, cls?: string, stacked?: boolean): HTMLDivElement {
  const el = document.createElement("div");
  el.className = `${MINI_CARD_CLASS}-row${stacked ? " stacked" : ""}`;
  el.innerHTML = `
    <span class="${MINI_CARD_CLASS}-row-label"><span class="${MINI_CARD_CLASS}-row-icon">${icon}</span>${label}</span>
    <span class="${MINI_CARD_CLASS}-row-value${cls ? " " + cls : ""}">${value}</span>
  `;
  return el;
}

function buildMiniCard(item: ShopItem, locked: boolean): HTMLElement {
  const mini = document.createElement("div");
  mini.className = MINI_CARD_CLASS;
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
    const collapsed = !collapsedState.get(item.el!);
    collapsedState.set(item.el!, collapsed);
    body.style.display = collapsed ? "none" : "";
    toggle.textContent = collapsed ? "+" : "–";
    applySpacing(item.el!, mini);
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
    if (!item.thumbnailUrl) return;
    const a = document.createElement("a");
    a.href = item.thumbnailUrl;
    a.download = `${item.itemId ?? "produto"}.jpg`;
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
    showMakerWorldMenu(makerWorldBtn, item.name, item.thumbnailUrl ?? null);
  };

  actions.append(downloadBtn, makerWorldBtn);
  body.appendChild(actions);

  const content = document.createElement("div");
  content.className = `${MINI_CARD_CLASS}-content${locked ? " locked" : ""}`;

  const created = document.createElement("div");
  created.className = `${MINI_CARD_CLASS}-created`;
  const bucket = ageBucketClass(item.createdDaysAgo);
  created.innerHTML = `
    <span>📅 ${item.createdAt ? item.createdAt.toLocaleDateString("pt-BR") : "data desconhecida"}</span>
    <span class="${MINI_CARD_CLASS}-age ${bucket}">${item.createdDaysAgo != null ? `${item.createdDaysAgo}d` : "?"}</span>
  `;
  content.appendChild(created);

  const rows = document.createElement("div");
  rows.className = `${MINI_CARD_CLASS}-rows`;
  rows.appendChild(row("Vendido (total)", "📦", item.sold != null ? String(item.sold) : "—"));

  // "Vendido/mês" da própria Shopee pode vir 0 mesmo com venda real (ver
  // comentário em lib/shopeeParse.ts) — quando vier 0 mas o item tem venda
  // histórica, mostra a estimativa própria no lugar, com nota explicando.
  const monthlyConfiavel = item.soldMonthly != null && (item.soldMonthly > 0 || (item.sold ?? 0) === 0);
  const monthlyEstimado = item.salesPerDayEstimado != null ? item.salesPerDayEstimado * 30 : null;
  if (monthlyConfiavel) {
    rows.appendChild(row("Vendido · 30 dias", "⚡", String(item.soldMonthly)));
  } else if (monthlyEstimado != null) {
    rows.appendChild(row("Vendido · 30 dias (estimativa)", "⚡", monthlyEstimado.toFixed(1)));
  } else {
    rows.appendChild(row("Vendido · 30 dias", "⚡", "—"));
  }

  rows.appendChild(row("Nota", "⭐", item.rating != null ? `${item.rating.toFixed(1)} (${item.reviewCount ?? 0})` : "—"));
  rows.appendChild(row("Favoritos", "❤", item.liked != null ? String(item.liked) : "—"));
  if (item.price != null && item.sold != null) {
    rows.appendChild(row("Faturamento total", "💰", fmtBRL(item.price * item.sold), "money", true));
  }
  if (item.price != null) {
    const monthlyRevenue = monthlyConfiavel && item.soldMonthly != null
      ? item.soldMonthly * item.price
      : monthlyEstimado != null
        ? monthlyEstimado * item.price
        : null;
    if (monthlyRevenue != null) {
      rows.appendChild(row("Faturamento · 30 dias", "🏦", fmtBRL(monthlyRevenue), "money", true));
    }
  }
  content.appendChild(rows);

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
  if (collapsedState.get(item.el!)) {
    body.style.display = "none";
    toggle.textContent = "+";
  }
  return mini;
}

function applySpacing(cardEl: HTMLElement, mini: HTMLElement) {
  if (!originalMargins.has(cardEl)) {
    originalMargins.set(cardEl, cardEl.style.marginBottom || "");
  }
  const gap = 10;
  cardEl.style.marginBottom = `${mini.offsetHeight + gap}px`;
}

function positionMiniCard(mini: HTMLElement, cardEl: HTMLElement): boolean {
  const rect = cardEl.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
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

/** Cria (ou atualiza) o mini-card de um item e reposiciona sobre o card real da loja. */
export function upsertShopMiniCard(item: ShopItem, locked: boolean) {
  if (!item.el) return;
  ensureMiniCardStyles();

  let mini = registry.get(item.el);
  if (!mini) {
    mini = buildMiniCard(item, locked);
    registry.set(item.el, mini);
    getLayer().appendChild(mini);
  } else {
    const rebuilt = buildMiniCard(item, locked);
    mini.replaceWith(rebuilt);
    registry.set(item.el, rebuilt);
    mini = rebuilt;
  }
  if (positionMiniCard(mini, item.el)) applySpacing(item.el, mini);
}

/** Remove mini-cards de itens que não estão mais na lista atual (ex.: card saiu do DOM). */
export function pruneShopMiniCards(activeEls: Set<HTMLElement>) {
  for (const [el, mini] of registry) {
    if (!activeEls.has(el) || !document.contains(el)) {
      mini.remove();
      registry.delete(el);
      el.style.marginBottom = originalMargins.get(el) ?? "";
      originalMargins.delete(el);
    }
  }
}

export function repositionAllShopMiniCards() {
  for (const [el, mini] of registry) {
    if (!document.contains(el)) continue;
    if (positionMiniCard(mini, el)) applySpacing(el, mini);
  }
}

export function clearAllShopMiniCards() {
  for (const [el, mini] of registry) {
    mini.remove();
    el.style.marginBottom = originalMargins.get(el) ?? "";
  }
  registry.clear();
}
