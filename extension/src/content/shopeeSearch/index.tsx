import { createRoot, type Root } from "react-dom/client";
import { Panel } from "./Panel";
import { scrapeSearchCards, type ScrapedCard } from "./scrape";
import { extractKeywords } from "./keywordExtract";
import { BADGE_STYLES } from "../styles";

const HOST_ID = "mp3d-shopee-search-panel";
const BADGE_CLASS = "mp3d-badge";
/** Marca os N cards mais vendidos como "campeão" (ou 20% da amostra, o que for maior). */
const MIN_CHAMPIONS = 5;
const CHAMPION_RATIO = 0.2;

function clearBadges() {
  document.querySelectorAll(`.${BADGE_CLASS}`).forEach((b) => b.remove());
}

function highlightChampions(cards: ScrapedCard[]) {
  clearBadges();
  const withSales = cards.filter((c) => c.soldCount > 0).sort((a, b) => b.soldCount - a.soldCount);
  const n = Math.max(MIN_CHAMPIONS, Math.round(withSales.length * CHAMPION_RATIO));
  const champions = withSales.slice(0, n);

  for (const c of champions) {
    const computed = window.getComputedStyle(c.el);
    if (computed.position === "static") c.el.style.position = "relative";
    const badge = document.createElement("div");
    badge.className = BADGE_CLASS;
    badge.textContent = `🔥 ${c.soldCount.toLocaleString("pt-BR")} vendidos`;
    c.el.appendChild(badge);
  }

  return champions.length;
}

function mountPanel(): { root: Root; render: (cards: ScrapedCard[]) => void } {
  const host = document.createElement("div");
  host.id = HOST_ID;
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = BADGE_STYLES;
  shadow.appendChild(style);

  const mountPoint = document.createElement("div");
  shadow.appendChild(mountPoint);
  const root = createRoot(mountPoint);

  const render = (cards: ScrapedCard[]) => {
    const championCount = highlightChampions(cards);
    const titles = cards.map((c) => c.title).filter((t): t is string => !!t);
    const keywords = extractKeywords(titles);
    root.render(
      <Panel
        cardCount={cards.length}
        championCount={championCount}
        keywords={keywords}
        onRescan={() => render(scrapeSearchCards())}
      />,
    );
  };

  return { root, render };
}

function start() {
  if (document.getElementById(HOST_ID)) return;
  const { render } = mountPanel();

  // A lista carrega aos poucos (scroll infinito / lazy render) — reanalisa
  // algumas vezes nos primeiros segundos pra pegar mais cards.
  let attempts = 0;
  const poll = window.setInterval(() => {
    attempts += 1;
    render(scrapeSearchCards());
    if (attempts >= 5) window.clearInterval(poll);
  }, 1500);
}

start();
