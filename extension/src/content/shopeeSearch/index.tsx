import { createRoot, type Root } from "react-dom/client";
import { Panel } from "./Panel";
import { watchSearchItems, type EnrichedCard } from "./scrape";
import { extractKeywords } from "./keywordExtract";
import { computePageStats, groupBySeller, pickChampions } from "./aggregate";
import { onDiagnostic, type Diagnostic } from "../../lib/shopeeCapture";
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

  let latestCards: EnrichedCard[] = [];
  let latestDiagnostic: Diagnostic | null = null;
  let received = false;

  const render = (loading: boolean) => {
    const championCount = paintChampionBadges(latestCards);
    const stats = computePageStats(latestCards);
    const sellers = groupBySeller(latestCards);
    const titles = latestCards.map((c) => c.name).filter((t): t is string => !!t);
    const keywords = extractKeywords(titles);

    root.render(
      <Panel
        loading={loading}
        championCount={championCount}
        stats={stats}
        sellers={sellers}
        keywords={keywords}
        diagnostic={latestDiagnostic}
        onRescan={() => window.location.reload()}
      />,
    );
  };

  render(true);

  onDiagnostic((d) => {
    latestDiagnostic = d;
    render(!received);
  });

  watchSearchItems((cards) => {
    received = true;
    latestCards = cards;
    render(false);
  });
}

start();
