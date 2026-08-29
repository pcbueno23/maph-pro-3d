/**
 * Card de estatísticas anexado embaixo de CADA anúncio na grade de busca —
 * DOM puro (não React) por performance: uma busca pode ter 60-90 cards, e
 * recriar uma árvore React por card a cada nova captura seria caro. O CSS é
 * injetado uma vez em `document.head` (não em Shadow DOM): esse card precisa
 * participar do fluxo normal do grid da Shopee, empurrando a altura do card
 * pra baixo — Shadow DOM não impediria isso, mas manter tudo num único
 * stylesheet global fica mais simples de manter aqui.
 */
import type { EnrichedCard } from "./scrape";

const MINI_CARD_CLASS = "mp3d-mini";
const STYLE_ID = "mp3d-mini-style";

export function ensureMiniCardStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.${MINI_CARD_CLASS} {
  margin-top: 6px;
  border-radius: 10px;
  border: 1px solid rgba(51,65,85,0.7);
  background: rgba(2,6,23,0.96);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 11px;
  color: #e2e8f0;
  overflow: hidden;
}
.${MINI_CARD_CLASS}.champion { border-color: rgba(250,204,21,0.6); box-shadow: 0 0 0 1px rgba(250,204,21,0.25) inset; }
.${MINI_CARD_CLASS}-actions {
  display: flex;
  gap: 4px;
  padding: 6px;
  border-bottom: 1px solid rgba(51,65,85,0.6);
}
.${MINI_CARD_CLASS}-actions button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  border-radius: 6px;
  border: 1px solid rgba(51,65,85,0.7);
  background: rgba(15,23,42,0.7);
  color: #94a3b8;
  cursor: pointer;
  font-size: 11px;
  padding: 0;
}
.${MINI_CARD_CLASS}-actions button:hover { color: #67e8f9; border-color: rgba(34,211,238,0.4); }
.${MINI_CARD_CLASS}-created {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 8px;
  border-bottom: 1px solid rgba(51,65,85,0.5);
  font-size: 10.5px;
  color: #94a3b8;
}
.${MINI_CARD_CLASS}-age {
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
}
.${MINI_CARD_CLASS}-age.new { background: rgba(52,211,153,0.15); color: #34d399; }
.${MINI_CARD_CLASS}-age.mid { background: rgba(251,191,36,0.15); color: #fbbf24; }
.${MINI_CARD_CLASS}-age.old { background: rgba(251,113,133,0.15); color: #fb7185; }
.${MINI_CARD_CLASS}-rows { padding: 2px 8px; }
.${MINI_CARD_CLASS}-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3.5px 0;
  border-bottom: 1px solid rgba(51,65,85,0.35);
}
.${MINI_CARD_CLASS}-row:last-child { border-bottom: none; }
.${MINI_CARD_CLASS}-row-label { display: flex; align-items: center; gap: 5px; color: #94a3b8; }
.${MINI_CARD_CLASS}-row-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background: rgba(99,102,241,0.15);
  font-size: 9px;
  flex-shrink: 0;
}
.${MINI_CARD_CLASS}-row-value { font-weight: 700; color: #f1f5f9; }
.${MINI_CARD_CLASS}-row-value.money { color: #34d399; }
.${MINI_CARD_CLASS}-row-value.champ { color: #facc15; }
.${MINI_CARD_CLASS}-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-top: 1px solid rgba(51,65,85,0.6);
  font-size: 10px;
  color: #94a3b8;
}
.${MINI_CARD_CLASS}-footer b { color: #cbd5e1; font-weight: 600; }
`;
  document.head.appendChild(style);
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

/** Cria (ou atualiza, se já existir) o mini-card de estatísticas dentro de `card.el`. */
export function renderMiniCard(card: EnrichedCard, isChampion: boolean) {
  if (!card.el) return;
  ensureMiniCardStyles();

  card.el.querySelector(`.${MINI_CARD_CLASS}`)?.remove();

  const mini = document.createElement("div");
  mini.className = MINI_CARD_CLASS + (isChampion ? " champion" : "");

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
  mini.appendChild(actions);

  const created = document.createElement("div");
  created.className = `${MINI_CARD_CLASS}-created`;
  const bucket = ageBucketClass(card.createdDaysAgo);
  created.innerHTML = `
    <span>📅 ${card.createdAt ? card.createdAt.toLocaleDateString("pt-BR") : "data desconhecida"}</span>
    <span class="${MINI_CARD_CLASS}-age ${bucket}">${card.createdDaysAgo != null ? `${card.createdDaysAgo}d` : "?"}</span>
  `;
  mini.appendChild(created);

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
  rows.appendChild(row("Avaliações", "💬", card.reviewCount != null ? String(card.reviewCount) : "—"));
  rows.appendChild(row("Nota", "⭐", card.rating != null ? card.rating.toFixed(1) : "—"));
  rows.appendChild(row("Favoritos", "❤", card.liked != null ? String(card.liked) : "—"));

  if (card.price != null && card.sold != null) {
    rows.appendChild(row("Faturamento total", "💰", fmtBRL(card.price * card.sold), "money"));
  }
  if (card.price != null && card.salesPerDay != null) {
    rows.appendChild(row("Faturamento/dia", "📈", fmtBRL(card.price * card.salesPerDay), "money"));
    rows.appendChild(row("Faturamento/mês", "🏦", fmtBRL(card.price * card.salesPerDay * 30), "money"));
  }
  mini.appendChild(rows);

  if (card.sellerName) {
    const footer = document.createElement("div");
    footer.className = `${MINI_CARD_CLASS}-footer`;
    footer.innerHTML = `<b>${card.sellerName}</b><span>${card.sellerLocation ?? ""}${card.isInternational ? " · internacional" : ""}</span>`;
    mini.appendChild(footer);
  }

  card.el.appendChild(mini);
}
