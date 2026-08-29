import { createRoot, type Root } from "react-dom/client";
import { Panel } from "./Panel";
import { watchSearchItems, type EnrichedCard, type SearchDebugInfo } from "./scrape";
import { extractKeywords } from "./keywordExtract";
import { computePageStats, groupBySeller, pickChampions, matchesFilter, type FilterKey } from "./aggregate";
import { upsertMiniCard, pruneMiniCards, repositionAllMiniCards, setCardVisible, clearAllMiniCards } from "./miniCard";
import { onDiagnostic, type Diagnostic } from "../../lib/shopeeCapture";
import { sendToBackground } from "../../lib/messaging";
import { onAuthChange, isAdminEmail } from "../../lib/authGate";
import { BADGE_STYLES } from "../styles";

const HOST_ID = "mp3d-shopee-search-panel";

/**
 * Mostra/esconde os cards REAIS da Shopee de acordo com o filtro ativo (só
 * cria mini-card pros que ficam visíveis) e devolve a contagem de campeões
 * pro painel.
 */
function paintMiniCards(cards: EnrichedCard[], filter: FilterKey | null, locked: boolean) {
  const champions = pickChampions(cards);
  const activeEls = new Set<HTMLElement>();

  for (const c of cards) {
    if (!c.el) continue;
    const visible = filter == null || matchesFilter(c, filter, champions);
    setCardVisible(c.el, visible);
    if (!visible) continue;
    activeEls.add(c.el);
    upsertMiniCard(c, champions.has(c.el), locked);
  }

  pruneMiniCards(activeEls);
  return champions.size;
}

function mountPanel(): { root: Root; host: HTMLElement } {
  const host = document.createElement("div");
  host.id = HOST_ID;
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = BADGE_STYLES;
  shadow.appendChild(style);

  const mountPoint = document.createElement("div");
  shadow.appendChild(mountPoint);
  return { root: createRoot(mountPoint), host };
}

/** Monta o painel + os mini-cards da busca. Devolve uma função de limpeza (usada quando a Shopee navega pra outro tipo de página via SPA, sem recarregar). */
export function mountSearchPanel(): () => void {
  if (document.getElementById(HOST_ID)) return () => {};
  const { root, host } = mountPanel();

  let latestCards: EnrichedCard[] = [];
  let latestDiagnostic: Diagnostic | null = null;
  let latestSearchDebug: SearchDebugInfo | null = null;
  let activeFilter: FilterKey | null = null;
  let received = false;
  let stopped = false;
  let signedIn = false;
  let isAdmin = false;

  const render = (loading: boolean) => {
    if (stopped) return;
    const championCount = paintMiniCards(latestCards, activeFilter, !signedIn);
    // Reposiciona de novo logo em seguida: esconder/mostrar cards muda a
    // altura da página, então as posições lidas durante paintMiniCards já
    // podem estar levemente desatualizadas pros cards processados depois.
    window.setTimeout(() => {
      if (!stopped) repositionAllMiniCards();
    }, 60);

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
        signedIn={signedIn}
        isAdmin={isAdmin}
      />,
    );
  };

  const refreshAuth = async () => {
    const auth = await sendToBackground({ type: "GET_AUTH_STATE" });
    signedIn = auth.status === "signed_in";
    isAdmin = auth.status === "signed_in" && isAdminEmail(auth.email);
    render(!received);
  };
  refreshAuth();
  // O login acontece numa aba separada (popup) — reage sozinho quando a
  // sessão muda, sem precisar recarregar a página da Shopee.
  const stopAuthWatch = onAuthChange(refreshAuth);

  render(true);

  // Coordenadas são absolutas na página (não fixas), então rolar a tela não
  // precisa de reposicionamento — só resize e o próprio carregamento
  // preguiçoso das imagens da Shopee, que muda a altura dos cards depois.
  window.addEventListener("resize", repositionAllMiniCards);
  const warmupTimers = [500, 1200, 2500, 4000].map((delay) =>
    window.setTimeout(() => {
      if (!stopped) repositionAllMiniCards();
    }, delay),
  );

  const stopDiagnostic = onDiagnostic((d) => {
    latestDiagnostic = d;
    render(!received);
  });

  const stopWatch = watchSearchItems(
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

  return () => {
    stopped = true;
    stopWatch();
    stopDiagnostic();
    stopAuthWatch();
    window.removeEventListener("resize", repositionAllMiniCards);
    warmupTimers.forEach((t) => window.clearTimeout(t));
    clearAllMiniCards();
    root.unmount();
    host.remove();
  };
}
