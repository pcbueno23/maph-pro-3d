import { createRoot, type Root } from "react-dom/client";
import { Panel } from "./Panel";
import { watchSearchItems, type EnrichedCard } from "./scrape";
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
    if (!c.el || !champions.has(c.el)) continue;
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

function start() {
  if (document.getElementById(HOST_ID)) return;
  const root = mountPanel();
  let received = false;

  const renderEmpty = () => {
    root.render(
      <Panel
        loading={true}
        championCount={0}
        stats={computePageStats([])}
        sellers={[]}
        keywords={[]}
        onRescan={() => {
          /* rescan é automático — a Shopee reemite a chamada ao rolar/filtrar */
        }}
      />,
    );
  };
  renderEmpty();

  watchSearchItems((cards) => {
    received = true;
    const championCount = paintChampionBadges(cards);
    const stats = computePageStats(cards);
    const sellers = groupBySeller(cards);
    const titles = cards.map((c) => c.name).filter((t): t is string => !!t);
    const keywords = extractKeywords(titles);

    root.render(
      <Panel
        loading={false}
        championCount={championCount}
        stats={stats}
        sellers={sellers}
        keywords={keywords}
        onRescan={() => window.location.reload()}
      />,
    );
  });

  window.setTimeout(() => {
    if (!received) {
      console.error(
        "[Maph Pro 3D] não capturei nenhuma chamada de search_items nos primeiros segundos — role a página pra forçar a Shopee a buscar mais resultados.",
      );
    }
  }, 8000);
}

start();
