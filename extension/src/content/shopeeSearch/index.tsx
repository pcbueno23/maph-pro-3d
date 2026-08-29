import { createRoot, type Root } from "react-dom/client";
import { Panel } from "./Panel";
import { watchSearchItems, type EnrichedCard, type SearchDebugInfo } from "./scrape";
import { extractKeywords } from "./keywordExtract";
import { computePageStats, groupBySeller, pickChampions, matchesFilter, type FilterKey } from "./aggregate";
import { upsertMiniCard, pruneMiniCards, repositionAllMiniCards, setCardVisible } from "./miniCard";
import { onDiagnostic, type Diagnostic } from "../../lib/shopeeCapture";
import { BADGE_STYLES } from "../styles";

const HOST_ID = "mp3d-shopee-search-panel";

/**
 * Mostra/esconde os cards REAIS da Shopee de acordo com o filtro ativo (só
 * cria mini-card pros que ficam visíveis) e devolve a contagem de campeões
 * pro painel.
 */
function paintMiniCards(cards: EnrichedCard[], filter: FilterKey | null) {
  const champions = pickChampions(cards);
  const activeEls = new Set<HTMLElement>();

  for (const c of cards) {
    if (!c.el) continue;
    const visible = filter == null || matchesFilter(c, filter, champions);
    setCardVisible(c.el, visible);
    if (!visible) continue;
    activeEls.add(c.el);
    upsertMiniCard(c, champions.has(c.el));
  }

  pruneMiniCards(activeEls);
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
  let activeFilter: FilterKey | null = null;
  let received = false;

  const render = (loading: boolean) => {
    const championCount = paintMiniCards(latestCards, activeFilter);
    // Reposiciona de novo logo em seguida: esconder/mostrar cards muda a
    // altura da página, então as posições lidas durante paintMiniCards já
    // podem estar levemente desatualizadas pros cards processados depois.
    window.setTimeout(repositionAllMiniCards, 60);

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
        activeFilter={activeFilter}
        onFilterChange={(next) => {
          activeFilter = activeFilter === next ? null : next;
          render(false);
        }}
        onRescan={() => window.location.reload()}
      />,
    );
  };

  render(true);

  // Coordenadas são absolutas na página (não fixas), então rolar a tela não
  // precisa de reposicionamento — só resize e o próprio carregamento
  // preguiçoso das imagens da Shopee, que muda a altura dos cards depois.
  window.addEventListener("resize", repositionAllMiniCards);
  for (const delay of [500, 1200, 2500, 4000]) window.setTimeout(repositionAllMiniCards, delay);

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
