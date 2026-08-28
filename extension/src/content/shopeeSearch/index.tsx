import { createRoot, type Root } from "react-dom/client";
import { Panel } from "./Panel";
import { scrapeSearchCards, enrichCards, type EnrichedCard, type ScrapedCard } from "./scrape";
import { extractKeywords } from "./keywordExtract";
import { computePageStats, groupBySeller, pickChampions } from "./aggregate";
import { BADGE_STYLES } from "../styles";

const HOST_ID = "mp3d-shopee-search-panel";
const BADGE_CLASS = "mp3d-badge";

function clearBadges() {
  document.querySelectorAll(`.${BADGE_CLASS}`).forEach((b) => b.remove());
}

function paintChampionBadges(cards: EnrichedCard[]) {
  clearBadges();
  const champions = pickChampions(cards);
  for (const c of cards) {
    if (!champions.has(c.el)) continue;
    const computed = window.getComputedStyle(c.el);
    if (computed.position === "static") c.el.style.position = "relative";
    const badge = document.createElement("div");
    badge.className = BADGE_CLASS;
    const perDay = c.salesPerDay != null ? c.salesPerDay.toFixed(1) : "?";
    badge.textContent = `🏆 ${perDay}/dia`;
    c.el.appendChild(badge);
  }
  return champions.size;
}

function mountPanel(): Root {
  const host = document.createElement("div");
  host.id = HOST_ID;
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = BADGE_STYLES;
  shadow.appendChild(style);

  const mountPoint = document.createElement("div");
  shadow.appendChild(mountPoint);
  return createRoot(mountPoint);
}

function toEnrichedFallback(cards: ScrapedCard[]): EnrichedCard[] {
  return cards.map((c) => ({
    ...c,
    rating: null,
    reviewCount: null,
    favorites: null,
    createdDaysAgo: null,
    salesPerDay: null,
    sellerName: null,
    sellerLocation: null,
    isInternational: false,
  }));
}

async function analyze(root: Root) {
  const rawCards = scrapeSearchCards();

  const render = (cards: EnrichedCard[], loading: boolean) => {
    const championCount = paintChampionBadges(cards);
    const stats = computePageStats(cards);
    const sellers = groupBySeller(cards);
    const titles = cards.map((c) => c.title).filter((t): t is string => !!t);
    const keywords = extractKeywords(titles);

    root.render(
      <Panel
        loading={loading}
        championCount={championCount}
        stats={stats}
        sellers={sellers}
        keywords={keywords}
        onRescan={() => void analyze(root)}
      />,
    );
  };

  // Pinta algo imediatamente com o scrape rápido, e vai enriquecendo em cima.
  render(toEnrichedFallback(rawCards), true);
  const enriched = await enrichCards(rawCards, (partial) => render(partial, true));
  render(enriched, false);
}

function start() {
  let root: Root;
  const existing = document.getElementById(HOST_ID);
  if (existing) return;
  root = mountPanel();

  void analyze(root);

  // A lista carrega aos poucos (scroll infinito / lazy render) — reanalisa
  // algumas vezes nos primeiros segundos pra pegar mais cards.
  let attempts = 0;
  const poll = window.setInterval(() => {
    attempts += 1;
    void analyze(root);
    if (attempts >= 3) window.clearInterval(poll);
  }, 3000);
}

start();
