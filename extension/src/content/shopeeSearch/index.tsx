import { createRoot, type Root } from "react-dom/client";
import { Panel } from "./Panel";
import { watchSearchItems, type EnrichedCard, type SearchDebugInfo } from "./scrape";
import { extractKeywords } from "./keywordExtract";
import { computePageStats, groupBySeller, pickChampions } from "./aggregate";
import { renderMiniCard } from "./miniCard";
import { onDiagnostic, type Diagnostic } from "../../lib/shopeeCapture";
import { BADGE_STYLES } from "../styles";

const HOST_ID = "mp3d-shopee-search-panel";
const MINI_CARD_CLASS = "mp3d-mini";

function paintMiniCards(cards: EnrichedCard[]) {
  const champions = pickChampions(cards);
  const seenEls = new Set<HTMLElement>();

  for (const c of cards) {
    if (!c.el) continue;
    seenEls.add(c.el);
    renderMiniCard(c, champions.has(c.el));
  }

  // Limpa mini-cards de anúncios que saíram da lista (ex.: filtro/ordenação mudou).
  document.querySelectorAll<HTMLElement>(`.${MINI_CARD_CLASS}`).forEach((el) => {
    const parent = el.parentElement;
    if (parent && !seenEls.has(parent)) el.remove();
  });

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
  let latestSearchDebug: SearchDebugInfo | null = null;
  let received = false;

  const render = (loading: boolean) => {
    const championCount = paintMiniCards(latestCards);
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
        searchDebug={latestSearchDebug}
        onRescan={() => window.location.reload()}
      />,
    );
  };

  render(true);

  onDiagnostic((d) => {
    latestDiagnostic = d;
    render(!received);
  });

  watchSearchItems(
    (cards) => {
      received = true;
      latestCards = cards;
      render(false);
    },
    (debug) => {
      latestSearchDebug = debug;
      render(!received);
    },
  );
}

start();
